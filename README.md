# js-simplehdlc
A js implementation of the simplehdlc parser/encoder. This is a 1:1 port of the python implementation at [https://github.com/jeremyherbert/python-simplehdlc](https://github.com/jeremyherbert/python-simplehdlc). More information about the packet structure can be found at [https://github.com/jeremyherbert/simplehdlc](https://github.com/jeremyherbert/simplehdlc).

License is MIT.

### Installing

`npm install`

### Testing

`npm run test`

### Usage

```js
const SimpleHDLC = require('simplehdlc');

// note that encode is a class method
const encoded = SimpleHDLC.encode('abcdefg');

const success_callback = (payload) => {
    console.log("success:", payload);
}

const max_len = 1024;
const hdlc = SimpleHDLC(success_callback, max_len)
hdlc.parse(encoded)  // will print "success: b'abcdefg'" via the callback
```