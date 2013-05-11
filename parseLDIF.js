// Two compatibility shims
if (!String.prototype.trim) {
  String.prototype.trim = function () {
      return this.replace(/^\s+|\s+$/g,'');
    };
}

if (!String.prototype.trimRight) {
  String.prototype.trimRight = function () {
      return this.replace(/\s+$/,'');
    };
}

/**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*  From http://stackoverflow.com/questions/246801\
*    /how-can-you-encode-to-base64-using-javascript
*
**/
var Base64 = {

  // private property
  _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

  // public method for encoding
  encode : function (input) {
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;

    input = Base64._utf8_encode(input);

    while (i < input.length) {

      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output = output +
        this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
        this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);

    }

    return output;
  },

  // public method for decoding
  decode : function (input) {
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

    while (i < input.length) {

      enc1 = this._keyStr.indexOf(input.charAt(i++));
      enc2 = this._keyStr.indexOf(input.charAt(i++));
      enc3 = this._keyStr.indexOf(input.charAt(i++));
      enc4 = this._keyStr.indexOf(input.charAt(i++));

      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;

      output = output + String.fromCharCode(chr1);

      if (enc3 != 64) {
        output = output + String.fromCharCode(chr2);
      }
      if (enc4 != 64) {
        output = output + String.fromCharCode(chr3);
      }

    }

    output = Base64._utf8_decode(output);

    return output;

  },

  // private method for UTF-8 encoding
  _utf8_encode : function (string) {
    string = string.replace(/\r\n/g,"\n");
    var utftext = "";

    for (var n = 0; n < string.length; n++) {

      var c = string.charCodeAt(n);

      if (c < 128) {
        utftext += String.fromCharCode(c);
      }
      else if((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      }
      else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }

    }

    return utftext;
  },

  // private method for UTF-8 decoding
  _utf8_decode : function (utftext) {
    var string = "";
    var i = 0;
    var c = c1 = c2 = 0;

    while ( i < utftext.length ) {

      c = utftext.charCodeAt(i);

      if (c < 128) {
        string += String.fromCharCode(c);
        i++;
      }
      else if((c > 191) && (c < 224)) {
        c2 = utftext.charCodeAt(i+1);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        i += 2;
      }
      else {
        c2 = utftext.charCodeAt(i+1);
        c3 = utftext.charCodeAt(i+2);
        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        i += 3;
      }

    }

    return string;
  }

}

const usefulFields = ["birthyear", "c", "cn", "description",
    "facsimiletelephonenumber", "givenName", "homePhone", "l", "mail",
    "mobile", "mozillaHomeCountryName", "mozillaHomeLocalityName",
    "mozillaHomePostalCode", "mozillaHomeState", "mozillaHomeStreet",
    "mozillaHomeUrl", "mozillaNickname", "o", "sn", "st", "street",
    "telephoneNumber", "title"
    ];

/**
 * parse LDIF string into JavaScript Object
 *
 * @inStr String
 * @returns Object
 *
 * @todo
 * Tries to follow RFC2849, but
 *   - doesn’t even consider change requests, only complete values
 *   - doesn’t include version: field (seems to be ignored by
 *     Thunderbird as well).
 *   - ignores multi-value attributes completely
 *   - ignores < links
 */
function parseLDIF(inStr) {
  var record = {}, key, value, splitLine, colon_idx,
      out_records = [];

  inStr.forEach(function (line) {
      if (line != undefined) {
        line = line.trim();

        if (line.length === 0) {
          if (Object.keys(record).length > 0) {
            out_records.push(record);
            record = {};
          }
        }
        else {
          // comment line
          if (line[0] === "#") {
            return ;
          }
          else {
            colon_idx = line.indexOf(":");
            line = line.trim();

            // Line continuation
            // This is how it works in THunderbird exported LDIF
            // files, but not what RFC describes ... the first character
            // of continuing entry should be space, and the first line
            // of value should never be empty. Hopefully, this solution
            // should be at least compatible for reading of RFC LDIF
            // files (so it doesn’t hurt)
            if (colon_idx == -1) {
              // TODO
              // The question is whether we shouldn't trim
              // the result of .decode() function as well.
              record[key] += Base64.decode(line).trim();
              return;
            }
            else {
              key = line.slice(0, colon_idx);
              value = line.slice(colon_idx + 1);

              // base64 encoded value
              if (value[0] === ":") {
                value = Base64.decode(value.slice(1));
              }
            }

            if ((usefulFields.indexOf(key) != -1) &&
                 value.length > 0) {
              record[key] = value.trim();
            }
          }
        }
      }
  });

  return out_records;
}

if (arguments.length == 1) {
  var lines = readFile(arguments[0]).replace(/\r\n/g,"\n");
  print(parseLDIF(lines.split("\n")).toSource());
}
