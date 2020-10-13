import { Convert } from "pvtsutils";
import { PemConverter } from "@peculiar/x509";
import * as assert from "assert";

context("helpers", () => {

  context("pem converter", () => {

    context("encode/decode", () => {

      const PEM = "-----BEGIN CERTIFICATE-----\n" +
        "TWFuIGlzIGRpc3Rpbmd1aXNoZWQsIG5vdCBvbmx5IGJ5IGhpcyByZWFzb24sIGJ1\n" +
        "dCBieSB0aGlzIHNpbmd1bGFyIHBhc3Npb24gZnJvbSBvdGhlciBhbmltYWxzLCB3\n" +
        "aGljaCBpcyBhIGx1c3Qgb2YgdGhlIG1pbmQsIHRoYXQgYnkgYSBwZXJzZXZlcmFu\n" +
        "Y2Ugb2YgZGVsaWdodCBpbiB0aGUgY29udGludWVkIGFuZCBpbmRlZmF0aWdhYmxl\n" +
        "IGdlbmVyYXRpb24gb2Yga25vd2xlZGdlLCBleGNlZWRzIHRoZSBzaG9ydCB2ZWhl\n" +
        "bWVuY2Ugb2YgYW55IGNhcm5hbCBwbGVhc3VyZS4=\n" +
        "-----END CERTIFICATE-----\n" +
        "-----BEGIN CERTIFICATE-----\n" +
        "TWFuIGlzIGRpc3Rpbmd1aXNoZWQsIG5vdCBvbmx5IGJ5IGhpcyByZWFzb24sIGJ1\n" +
        "dCBieSB0aGlzIHNpbmd1bGFyIHBhc3Npb24gZnJvbSBvdGhlciBhbmltYWxzLCB3\n" +
        "aGljaCBpcyBhIGx1c3Qgb2YgdGhlIG1pbmQsIHRoYXQgYnkgYSBwZXJzZXZlcmFu\n" +
        "Y2Ugb2YgZGVsaWdodCBpbiB0aGUgY29udGludWVkIGFuZCBpbmRlZmF0aWdhYmxl\n" +
        "IGdlbmVyYXRpb24gb2Yga25vd2xlZGdlLCBleGNlZWRzIHRoZSBzaG9ydCB2ZWhl\n" +
        "bWVuY2Ugb2YgYW55IGNhcm5hbCBwbGVhc3VyZS4=\n" +
        "-----END CERTIFICATE-----\n" +
        "-----BEGIN CERTIFICATE-----\n" +
        "TWFuIGlzIGRpc3Rpbmd1aXNoZWQsIG5vdCBvbmx5IGJ5IGhpcyByZWFzb24sIGJ1\n" +
        "dCBieSB0aGlzIHNpbmd1bGFyIHBhc3Npb24gZnJvbSBvdGhlciBhbmltYWxzLCB3\n" +
        "aGljaCBpcyBhIGx1c3Qgb2YgdGhlIG1pbmQsIHRoYXQgYnkgYSBwZXJzZXZlcmFu\n" +
        "Y2Ugb2YgZGVsaWdodCBpbiB0aGUgY29udGludWVkIGFuZCBpbmRlZmF0aWdhYmxl\n" +
        "IGdlbmVyYXRpb24gb2Yga25vd2xlZGdlLCBleGNlZWRzIHRoZSBzaG9ydCB2ZWhl\n" +
        "bWVuY2Ugb2YgYW55IGNhcm5hbCBwbGVhc3VyZS4=\n" +
        "-----END CERTIFICATE-----";

      const DATA = "TWFuIGlzIGRpc3Rpbmd1aXNoZWQsIG5vdCBvbmx5IGJ5IGhpcyByZWFzb24sIGJ1dCBieSB0aGlzIHNpbmd1bGFyIHBhc3Npb24gZnJvbSBvdGhlciBhbmltYWxzLCB3aGljaCBpcyBhIGx1c3Qgb2YgdGhlIG1pbmQsIHRoYXQgYnkgYSBwZXJzZXZlcmFuY2Ugb2YgZGVsaWdodCBpbiB0aGUgY29udGludWVkIGFuZCBpbmRlZmF0aWdhYmxlIGdlbmVyYXRpb24gb2Yga25vd2xlZGdlLCBleGNlZWRzIHRoZSBzaG9ydCB2ZWhlbWVuY2Ugb2YgYW55IGNhcm5hbCBwbGVhc3VyZS4=";

      it("encode array", () => {
        const rawData = Convert.FromBase64(DATA);
        const rawDataArray: Array<BufferSource> = [rawData, rawData, rawData];
        const res = PemConverter.encode(rawDataArray, "certificate");
        assert.strictEqual(PEM, res);
      });

      it("encode", () => {
        const rawData = Convert.FromBase64("TWFuIGlzIGRpc3Rpbmd1aXNoZWQsIG5vdCBvbmx5IGJ5IGhpcyByZWFzb24sIGJ1");
        const expected = "-----BEGIN CERTIFICATE-----\n" +
          "TWFuIGlzIGRpc3Rpbmd1aXNoZWQsIG5vdCBvbmx5IGJ5IGhpcyByZWFzb24sIGJ1\n" +
          "-----END CERTIFICATE-----";
        const res = PemConverter.encode(rawData, "certificate");
        assert.strictEqual(expected, res);
      });

      it("decode", () => {
        const res = PemConverter.decode(PEM);
        assert.strictEqual(Convert.ToBase64(res[0]), DATA);
      });


    });

  });

});
