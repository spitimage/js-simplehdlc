/* SPDX-License-Identifier: MIT */
const crc32 = require('buffer-crc32');

function bytes(d) {
    return Buffer.from(d);
}

class SimpleHDLC {
    constructor(success_callback, max_len = 1024) {
        this._success_callback = success_callback;
        this._max_len = max_len;
        this._expected_len = 0;
        this._rx_crc32 = 0;
        this._rx_crc32_count = 0;
        this._escape_next = false;
        this._state = SimpleHDLC.STATE_WAITING_FOR_FRAME_MARKER;
        this._pending_payload = [];
    }

    parse(data) {
        for (let c of data) {
            if (c === SimpleHDLC.FRAME_BOUNDARY_MARKER) {
                this._expected_len = 0;
                this._rx_crc32 = 0;
                this._rx_crc32_count = 0;
                this._escape_next = false;
                this._state = SimpleHDLC.STATE_CONSUMING_SIZE_MSB;
                this._pending_payload = [];
                continue;
            }

            if (this._state === SimpleHDLC.STATE_WAITING_FOR_FRAME_MARKER) {
                continue;
            }

            if (this._escape_next) {
                c ^= (1 << 5);
                this._escape_next = false;
            }
            else if (c === SimpleHDLC.ESCAPE_MARKER) {
                this._escape_next = true;
                continue;
            }

            if (this._state === SimpleHDLC.STATE_CONSUMING_SIZE_MSB) {
                this._expected_len |= c << 8;
                this._state = SimpleHDLC.STATE_CONSUMING_SIZE_LSB;
            }
            else if (this._state === SimpleHDLC.STATE_CONSUMING_SIZE_LSB) {
                this._expected_len |= c;
                this._expected_len += 4; // for CRC32

                if (this._expected_len > (this._max_len + 4)) {
                    this._state = SimpleHDLC.STATE_WAITING_FOR_FRAME_MARKER;
                }
                else {
                    this._state = SimpleHDLC.STATE_CONSUMING_PAYLOAD;
                }
            }

            else if (this._state === SimpleHDLC.STATE_CONSUMING_PAYLOAD) {
                if (this._pending_payload.length < (this._expected_len - 4)) {
                    this._pending_payload.push(c);
                }
                else {
                    this._rx_crc32 |= c;
                    this._rx_crc32_count += 1;

                    if (this._rx_crc32_count === 4) {
                        const computed_crc32 = crc32.signed(bytes(this._pending_payload));

                        if (this._rx_crc32 === computed_crc32) {
                            this._success_callback(bytes(this._pending_payload));
                        }

                        this._state = SimpleHDLC.STATE_WAITING_FOR_FRAME_MARKER;
                    }
                    else {
                        this._rx_crc32 <<= 8;
                    }
                }
            }
        }
    }

}


// Start class properties
SimpleHDLC.FRAME_BOUNDARY_MARKER = 0x7E;
SimpleHDLC.ESCAPE_MARKER = 0x7D;
SimpleHDLC.STATE_WAITING_FOR_FRAME_MARKER = 0;
SimpleHDLC.STATE_CONSUMING_SIZE_MSB = 1;
SimpleHDLC.STATE_CONSUMING_SIZE_LSB = 2;
SimpleHDLC.STATE_CONSUMING_PAYLOAD = 3;

SimpleHDLC.encode = (payload) => {
    if (payload.length > 65536) {
        throw new Error("Maximum length of payload is 65536");
    }

    const payload_bytes = bytes(payload);

    const output = [SimpleHDLC.FRAME_BOUNDARY_MARKER];

    const add_to_buffer = (b) => {
        if (b == SimpleHDLC.FRAME_BOUNDARY_MARKER || b == SimpleHDLC.ESCAPE_MARKER) {
            output.push(SimpleHDLC.ESCAPE_MARKER);
            output.push(b ^ (1 << 5));
        }
        else {
            output.push(b);
        }
    }

    // Add 16 bit length
    add_to_buffer((payload_bytes.length & 0xFF00) >> 8);
    add_to_buffer(payload_bytes.length & 0xFF);

    for (let c of payload_bytes) {
        add_to_buffer(c);
    }

    const crc = crc32.signed(payload_bytes);

    // Add 32 bit checksum
    add_to_buffer((crc & 0xFF000000) >> 24);
    add_to_buffer((crc & 0xFF0000) >> 16);
    add_to_buffer((crc & 0xFF00) >> 8);
    add_to_buffer((crc & 0xFF));

    return bytes(output);
}

module.exports = SimpleHDLC;