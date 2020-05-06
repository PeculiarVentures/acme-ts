import { Convert } from "./convert";

export class Base64Url {
  public static encode(input: string) {
    const bytesToEncode: number[] = Convert.fromBase64String(input);
    return this.encodeByte(bytesToEncode);
  }

  public static encodeByte(input: number[]) {
    if (!input) {
      throw new Error("todo");
    }
    // throw new ArgumentNullException(nameof(input));
    if (input.length == 0){
      throw new Error("todo");
      // throw new ArgumentOutOfRangeException(nameof(input));
    }

    let output = Convert.toBase64String(input);

    output = output.split('=')[0]; // Remove any trailing '='s
    output = output.replace('+', '-'); // 62nd char of encoding
    output = output.replace('/', '_'); // 63rd char of encoding

    return output;
  }

  public static decodeArray(input: number[]) {
    const stringToDecode = Convert.toBase64String(input);

    return this.decode(stringToDecode);
  }

  public static decode(input: string) {
    if (!input){
      throw new Error("todo");
      // throw new ArgumentException(nameof(input));
    }

    var output = input;

    output = output.replace('-', '+'); // 62nd char of encoding
    output = output.replace('_', '/'); // 63rd char of encoding

    switch (output.length % 4) // Pad with trailing '='s
    {
      case 0:
        break; // No pad chars in this case
      case 2:
        output += "==";
        break; // Two pad chars
      case 3:
        output += "=";
        break; // One pad char
      default:
        throw new Error("Illegal base64url string.");
        // throw new FormatException("Illegal base64url string.");
    }

    return Convert.fromBase64String(output); // Standard base64 decoder
  }
}