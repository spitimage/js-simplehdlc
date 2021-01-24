/* SPDX-License-Identifier: MIT */
const SimpleHDLC = require('./simplehdlc');

test('test_encode_zero_length_payload', () => {
    const encoded = SimpleHDLC.encode('');
    expect(encoded.length).toBe(7);
});

test('test_encode', () => {
    const encoded = SimpleHDLC.encode([1]);
    expect(encoded).toEqual(Buffer.from([0x7E, 0x00, 0x01, 0x01, 0xA5, 0x05, 0xDF, 0x1B]));
});

test('test_encode_escaping', () => {
    const encoded = SimpleHDLC.encode([0x7E, 0x7D]);
    expect(encoded).toEqual(Buffer.from([0x7E, 0x00, 0x02, 0x7D, 0x7E ^ (1 << 5), 0x7D, 0x7D ^ (1 << 5), 0xDE, 0xD1, 0x4B, 0x06]));
});

test('test_parse', () => {
    const encoded = SimpleHDLC.encode([1]);
    let parsed = false;

    const parse_success = payload => {
        expect(payload).toEqual(Buffer.from([1]))
        parsed = true;
    }

    const hdlc = new SimpleHDLC(parse_success);
    hdlc.parse(encoded);
    expect(parsed).toBe(true);
});

test('test_parse_zero_length', () => {
    const encoded = SimpleHDLC.encode('');
    let parsed = false;

    const parse_success = payload => {
        expect(payload).toEqual(Buffer.from(''))
        parsed = true;
    }

    const hdlc = new SimpleHDLC(parse_success);
    hdlc.parse(encoded);
    expect(parsed).toBe(true);
});

test('test_parse_packet_too_big', () => {
    const encoded = SimpleHDLC.encode([...Array(10).keys()]);
    let parsed = false;

    const parse_success = payload => {
        parsed = true;
    }

    let hdlc = new SimpleHDLC(parse_success, 9);
    hdlc.parse(encoded);
    expect(parsed).toBe(false);

    hdlc = new SimpleHDLC(parse_success, 10);
    hdlc.parse(encoded);
    expect(parsed).toBe(true);

});