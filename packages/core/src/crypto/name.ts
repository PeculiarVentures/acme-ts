import { AttributeTypeAndValue, AttributeValue, Name as AsnName, RelativeDistinguishedName } from "@peculiar/asn1-x509";
import { AsnConvert } from "@peculiar/asn1-schema";
import { BufferSourceConverter, Convert } from "pvtsutils";

const names: [string, string][] = [
  ["CN", "2.5.4.3"], // commonName
  ["L", "2.5.4.7"],  // localityName
  ["ST", "2.5.4.8"], // stateOrProvinceName
  ["O", "2.5.4.10"], // organizationName
  ["OU", "2.5.4.11"], // organizationalUnitName
  ["C", "2.5.4.6"], // countryName
  ["DC", "0.9.2342.19200300.100.1.25"], // domainComponent
  ["E", "1.2.840.113549.1.9.1"], // Email
  ["G", "2.5.4.42"],
  ["I", "2.5.4.43"],
  ["SN", "2.5.4.4"],
  ["T", "2.5.4.12"],
];

export interface JsonAttributeAndValue {
  [type: string]: string[];
}
export type JsonName = Array<JsonAttributeAndValue>;

const special = [",", "+", "\"", "\\", "<", ">", ";", "#", " "];

/**
 * Returns true if string  contains a special char
 * @param data string to be tested
 */
function quotes(data: string) {
  // a space or "#" character occurring at the beginning of the string
  return /^[ #]/.test(data)
    // a space character occurring at the end of the string
    || /[ ]$/.test(data)
    // one of the characters ",", "+", """, "\", "<", ">" or ";"
    || /[,+"\\<>;]/.test(data);
}

function replaceUnknownCharacter(text: string, char: string) {
  return `\\${Convert.ToHex(Convert.FromUtf8String(char)).toUpperCase()}`;
}

function escape(data: string) {
  return data
    .replace(/([,+"\\<>;])/g, "\\$1") // one of the characters ",", "+", """, "\", "<", ">" or ";"
    .replace(/^([ #])/, "\\$1") // a space or "#" character occurring at the beginning of the string
    .replace(/([ ]$)/, "\\$1") // a space character occurring at the end of the string
    .replace(/([\r\n\t])/, replaceUnknownCharacter) // unknown character
    ;
}

enum ValueType {
  simple,
  quoted,
  hexadecimal,
}

/**
 * UTF-8 String Representation of Distinguished Names
 *
 * https://tools.ietf.org/html/rfc2253
 */
export class Name {

  private asn = new AsnName();

  public constructor(data: BufferSource | AsnName | string | JsonName) {
    if (typeof data === "string") {
      this.asn = this.fromString(data);
    } else if (data instanceof AsnName) {
      this.asn = data;
    } else if (BufferSourceConverter.isBufferSource(data)) {
      this.asn = AsnConvert.parse(data, AsnName);
    } else {
      this.asn = this.fromJSON(data);
    }
  }

  /**
   * Returns string serialized Name
   */
  public toString() {
    return this.asn.map(rdn =>
      rdn.map(o => {
        const type = names.filter(n => n[1] === o.type)[0]?.[0] || o.type;
        const value = o.value.anyValue
          // If the AttributeValue is of a type which does not have a string
          // representation defined for it, then it is simply encoded as an
          // octothorpe character ('#' ASCII 35) followed by the hexadecimal
          // representation of each of the bytes of the BER encoding of the X.500
          // AttributeValue
          ? `#${Convert.ToHex(o.value.anyValue)}`
          // Otherwise, if the AttributeValue is of a type which has a string
          // representation, the value is converted first to a UTF-8 string
          // according to its syntax specification
          : escape(o.value.toString());
        return `${type}=${value}`;
      })
        .join("+"))
      .join(", ");
  }

  public toJSON() {
    const json: JsonName = [];

    for (const rdn of this.asn) {
      const jsonItem: JsonAttributeAndValue = {};
      for (const attr of rdn) {
        const type = names.filter(n => n[1] === attr.type)[0]?.[0] || attr.type;
        jsonItem[type] ??= [];
        jsonItem[type].push(attr.value.anyValue ? `#${Convert.ToHex(attr.value.anyValue)}` : attr.value.toString());
      }
      json.push(jsonItem);
    }
    return json;
  }

  /**
   * Creates AsnName object from string
   * @param data
   */
  private fromString(data: string) {
    const asn = new AsnName();

    let subAttribute = false;
    for (let i = 0; i < data.length; i++) {
      let char = data[i];

      // Read type
      let type = "";
      for (i; i < data.length; i++) {
        char = data[i];
        if (char === "=") {
          i++;
          break;
        }
        if (char === " ") {
          continue;
        }
        type += char;
      }
      if (!/[\d\.]+/.test(type)) {
        type = names
          .filter(o => o[0] === type)
          .map(o => o[1])[0];
      }
      if (!type) {
        throw new Error(`Cannot get OID for name type '${type}'`);
      }

      // Read value
      let value = "";
      let valueType = ValueType.simple;
      for (i; i < data.length; i++) {
        char = data[i];
        if (value === "") {
          if (char === "#") {
            valueType = ValueType.hexadecimal;
            continue;
          } else if (char === "\"") {
            valueType = ValueType.quoted;
            continue;
          }
        }

        if (valueType === ValueType.quoted && char === "\"") {
          // read till comma or plus character
          while (i++ < data.length) {
            char = data[i];
            if (data === "," || char === '+') {
              break;
            }
            if (data === " ") {
              continue;
            }
            throw new Error("Cannot parse name from string. Incorrect character after quoted attribute value");
          }
          break;
        } else if (valueType === ValueType.simple && (char === "," || char === '+')) {
          break;
        }

        // escaped character
        if (char === "\\") {
          char = data[++i];
          if (!special.includes(char)) {
            const hex = `${data[i++]}${data[i]}`;
            if (!/[0-9a-f]{2}/i.test(hex)) {
              throw new Error("Cannot parse name from string. Escaped hexadecimal value doesn't match to regular pattern");
            }
            char = String.fromCharCode(parseInt(hex, 16));
          }
        }

        value += char;

      }

      const attr = new AttributeTypeAndValue({ type });
      if (valueType === ValueType.hexadecimal) {
        attr.value.anyValue = Convert.FromHex(value);
      } else {
        attr.value.printableString = value;
      }
      if (subAttribute) {
        asn[asn.length - 1].push(attr);
      } else {
        asn.push(new RelativeDistinguishedName([attr]));
      }
      subAttribute = char === "+";
    }

    return asn;
  }

  fromJSON(data: JsonName): AsnName {
    const asn = new AsnName();

    for (const item of data) {
      const asnRdn = new RelativeDistinguishedName();
      for (const type in item) {
        let typeId = type;
        if (!/[\d\.]+/.test(type)) {
          typeId = names
            .filter(o => o[0] === type)
            .map(o => o[1])[0];
        }
        if (!typeId) {
          throw new Error(`Cannot get OID for name type '${type}'`);
        }

        const values = item[type];
        for (const value of values) {
          const asnAttr = new AttributeTypeAndValue({ type });
          if (value[0] === "#") {
            asnAttr.value.anyValue = Convert.FromHex(value.slice(1));
          } else {
            asnAttr.value.printableString = value;
          }
          asnRdn.push(asnAttr);
        }
      }

      asn.push(asnRdn);
    }

    return asn;
  }

}