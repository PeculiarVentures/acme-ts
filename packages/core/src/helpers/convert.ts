export class Convert {
  /**
     * Convert string to byte
     * @param str
     */
  public static fromBase64String(str: string) {
    let utf8 = [];
    for (let i = 0; i < str.length; i++) {
      let charcode = str.charCodeAt(i);
      if (charcode < 0x80) {
        utf8.push(charcode);
      }
      else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6),
          0x80 | (charcode & 0x3f));
      }
      else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(0xe0 | (charcode >> 12),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f));
      }
      // surrogate pair
      else {
        i++;
        // UTF-16 encodes 0x10000-0x10FFFF by
        // subtracting 0x10000 and splitting the
        // 20 bits of 0x0-0xFFFFF into two halves
        charcode = 0x10000 + (((charcode & 0x3ff) << 10)
          | (str.charCodeAt(i) & 0x3ff));
        utf8.push(0xf0 | (charcode >> 18),
          0x80 | ((charcode >> 12) & 0x3f),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f));
      }
    }
    return utf8;
  }

  /**
   * Convert byte to string
   * @param data
   */
  public static toBase64String(data: number[]) {
    const extraByteMap = [1, 1, 1, 1, 2, 2, 3, 0];
    const count = data.length;
    let str = "";

    for (let index = 0; index < count;) {
      let ch = data[index++];
      if (ch & 0x80) {
        let extra = extraByteMap[(ch >> 3) & 0x07];
        if (!(ch & 0x40) || !extra || ((index + extra) > count)) {
          throw new Error("cannot convert");
        }
        // return null;

        ch = ch & (0x3F >> extra);
        for (; extra > 0; extra -= 1) {
          const chx = data[index++];
          if ((chx & 0xC0) != 0x80) {
            throw new Error("cannot convert");
          }
          // return null;

          ch = (ch << 6) | (chx & 0x3F);
        }
      }

      str += String.fromCharCode(ch);
    }
    return str;
  }
}