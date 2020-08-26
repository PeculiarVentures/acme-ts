import * as assert from "assert";
import { Pkcs10CertificateRequest, X509Certificate, cryptoProvider, Name, JsonName } from "@peculiar/acme-core";
import { Convert } from "pvtsutils";
import { Crypto } from "@peculiar/webcrypto";
import { AttributeTypeAndValue, AttributeValue, Name as AsnName, RelativeDistinguishedName } from "@peculiar/asn1-x509";
import { X509CertificateGenerator } from "packages/core/src/crypto/x509_cert_generator";

context.only("crypto", () => {

  const crypto = new Crypto();
  cryptoProvider.set(crypto);

  context("Name", () => {

    function assertName(name: AsnName, text: string) {
      // serialize
      const value = new Name(name).toString();
      assert.strictEqual(value, text);

      // parse
      const name2 = new Name(text);
      assert.strictEqual(name2.toString(), text);
    }

    it("Simple list of RDNs (joined by comma)", () => {
      const name = new AsnName([
        new RelativeDistinguishedName([new AttributeTypeAndValue({ type: "2.5.4.3", value: new AttributeValue({ printableString: "Common Name" }) })]),
        new RelativeDistinguishedName([new AttributeTypeAndValue({ type: "2.5.4.6", value: new AttributeValue({ printableString: "RU" }) })])
      ]);

      assertName(name, "CN=Common Name, C=RU");
    });

    it("Simple list of DNs (joined by +)", () => {
      const name = new AsnName([
        new RelativeDistinguishedName([
          new AttributeTypeAndValue({ type: "2.5.4.3", value: new AttributeValue({ printableString: "Common Name" }) }),
          new AttributeTypeAndValue({ type: "2.5.4.6", value: new AttributeValue({ printableString: "RU" }) })]),
      ]);

      assertName(name, "CN=Common Name+C=RU");
    });

    it("Hexadecimal representation", () => {
      const name = new AsnName([
        new RelativeDistinguishedName([new AttributeTypeAndValue({ type: "1.2.3.4.5", value: new AttributeValue({ anyValue: new Uint8Array([0x04, 0x02, 0x48, 0x69]).buffer }) })]),
      ]);

      assertName(name, "1.2.3.4.5=#04024869");
    });

    context("Escaped chars", () => {

      it("# character at the beginning", () => {
        const name = new AsnName([
          new RelativeDistinguishedName([new AttributeTypeAndValue({ type: "1.2.3.4.5", value: new AttributeValue({ printableString: "#tag" }) })]),
        ]);

        assertName(name, "1.2.3.4.5=\\#tag");
      });

      it("space character at the beginning", () => {
        const name = new AsnName([
          new RelativeDistinguishedName([new AttributeTypeAndValue({ type: "1.2.3.4.5", value: new AttributeValue({ printableString: " tag" }) })]),
        ]);

        assertName(name, "1.2.3.4.5=\\ tag");
      });

      it("space character at the end", () => {
        const name = new AsnName([
          new RelativeDistinguishedName([new AttributeTypeAndValue({ type: "1.2.3.4.5", value: new AttributeValue({ printableString: "tag " }) })]),
        ]);

        assertName(name, "1.2.3.4.5=tag\\ ");
      });

      it("special characters", () => {
        const name = new AsnName([
          new RelativeDistinguishedName([new AttributeTypeAndValue({ type: "1.2.3.4.5", value: new AttributeValue({ printableString: ",+\"\\<>;" }) })]),
        ]);

        assertName(name, "1.2.3.4.5=\\,\\+\\\"\\\\\\<\\>\\;");
      });

      it("unknown characters", () => {
        const name = new AsnName([
          new RelativeDistinguishedName([new AttributeTypeAndValue({ type: "1.2.3.4.5", value: new AttributeValue({ printableString: "Hello\nworld" }) })]),
        ]);

        assertName(name, "1.2.3.4.5=Hello\\0Aworld");
      });

      it("parse quoted value", () => {
        const text = "CN=\"here is a test message with \\\",\\\" character\"+CN=It includes \\< \\> \\+ escaped characters\\ ";
        const name = new Name(text);
        assert.strictEqual(name.toString(), "CN=here is a test message with \\\"\\,\\\" character+CN=It includes \\< \\> \\+ escaped characters\\ ");
      });

    });

    it("json", () => {
      const text = "CN=name1, CN=name2+CN=name3+E=some@email.com, 1.2.3.4.5=#04020102+DC=some.com";
      const name = new Name(text);

      const json: JsonName = [
        { CN: ["name1"] },
        { CN: ["name2", "name3"], E: ["some@email.com"] },
        { "1.2.3.4.5": ["#04020102"], DC: ["some.com"] },
      ];
      assert.deepStrictEqual(name.toJSON(), json);

      const name2 = new Name(json);
      assert.strictEqual(name2.toString(), text);

      assert.strictEqual(Convert.ToHex(name.toArrayBuffer()), "3071310e300c060355040313056e616d65313139300c060355040313056e616d6532300c060355040313056e616d6533301b06092a864886f70d010901160e736f6d6540656d61696c2e636f6d3124300a06042a030405040201023016060a0992268993f22c6401191608736f6d652e636f6d");
    });

  });

  context("Pkcs10CertificateRequest", () => {

    it("read", () => {
      const pem = "MIICdDCCAVwCAQAwLzEtMA8GA1UEAxMIdGVzdE5hbWUwGgYJKoZIhvcNAQkBEw10ZXN0QG1haWwubm90MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArut7tLrb1BEHXImMTWipet+3/J2isn7mBv278oP7YyOkmX/Vzxvk9nvSc/B1wh6kSo6nfaxYacNNSP3r+WQYaTeLm5TsDbUfCJYtvvTuYH0GVTM8Qm7QhMZKnyUy/D60WNcRM4pnBDSEMpKppi7HhfL37DZpQnsQfr9r8LQPWZ9t/mf+FsSeWyQOQcz+ob6cODfNQIvbzpaXXdNpKIHLPW+/e4af5/WlZ9wL5Sy7kOf4X6nErdl74s1vSji9goANSQkd5TbswtFPRNybikrrisz0HtsIq2uTGDY6t3iOEHTe5qe/ux4anjbSqKVuIQEQWQOKb4h+mHTc+EC5yknihQIDAQABoAAwDQYJKoZIhvcNAQELBQADggEBAE7TU20ui1MLtxLM0UZMytYAjC7vtXxB5Vl6bzHUzZkVFW6oTeizqDxjeBtZ1SqErpgdyvzMvFSxF6f+679kl1/Zs2V0IPa4y58he3wTT/M1xCBN/bITY2cA4ETozbtK4cGoi6jY/0j8NcxTLfiBgwhE3ap+9GzLtWEhHWCXmpsohbvAktXSh1tLh4xmgoQoePEBSPbnaOmsonyzscKiBMASDvjrFdNbtD0uY2v/wYXwtRGvV/Q/O3lLWEosE4NdnZmgId4bm7ru48WucSnxuEJAkKUjDLrN0uqY/tKfX4Zy9w8Y/o+hk3QzNBVa3ZUvzDhVAmamQflvw3lXMm/JG4U=";
      const csr = new Pkcs10CertificateRequest(Convert.FromBase64(pem));
      assert.strictEqual(csr.subject, "CN=testName+E=test@mail.not");
    });

    it("verify", async () => {
      const pem = "MIICRzCCAS8CAQAwAjEAMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArut7tLrb1BEHXImMTWipet+3/J2isn7mBv278oP7YyOkmX/Vzxvk9nvSc/B1wh6kSo6nfaxYacNNSP3r+WQYaTeLm5TsDbUfCJYtvvTuYH0GVTM8Qm7QhMZKnyUy/D60WNcRM4pnBDSEMpKppi7HhfL37DZpQnsQfr9r8LQPWZ9t/mf+FsSeWyQOQcz+ob6cODfNQIvbzpaXXdNpKIHLPW+/e4af5/WlZ9wL5Sy7kOf4X6nErdl74s1vSji9goANSQkd5TbswtFPRNybikrrisz0HtsIq2uTGDY6t3iOEHTe5qe/ux4anjbSqKVuIQEQWQOKb4h+mHTc+EC5yknihQIDAQABoAAwDQYJKoZIhvcNAQELBQADggEBAE7TU20ui1MLtxLM0UZMytYAjC7vtXxB5Vl6bzHUzZkVFW6oTeizqDxjeBtZ1SqErpgdyvzMvFSxF6f+679kl1/Zs2V0IPa4y58he3wTT/M1xCBN/bITY2cA4ETozbtK4cGoi6jY/0j8NcxTLfiBgwhE3ap+9GzLtWEhHWCXmpsohbvAktXSh1tLh4xmgoQoePEBSPbnaOmsonyzscKiBMASDvjrFdNbtD0uY2v/wYXwtRGvV/Q/O3lLWEosE4NdnZmgId4bm7ru48WucSnxuEJAkKUjDLrN0uqY/tKfX4Zy9w8Y/o+hk3QzNBVa3ZUvzDhVAmamQflvw3lXMm/JG4U=";
      const csr = new Pkcs10CertificateRequest(Convert.FromBase64(pem));
      const ok = await csr.verify();
      assert.strictEqual(ok, true);
    });

  });

  context("x509", () => {

    const pem = "MIIDljCCAn6gAwIBAgIOSETcxtRwD/qzf0FjVvEwDQYJKoZIhvcNAQELBQAwZjELMAkGA1UEBhMCQkUxGTAXBgNVBAoTEEdsb2JhbFNpZ24gbnYtc2ExGjAYBgNVBAsTEUZvciBEZW1vIFVzZSBPbmx5MSAwHgYDVQQDExdHbG9iYWxTaWduIERlbW8gUm9vdCBDQTAeFw0xNjA3MjAwMDAwMDBaFw0zNjA3MjAwMDAwMDBaMGYxCzAJBgNVBAYTAkJFMRkwFwYDVQQKExBHbG9iYWxTaWduIG52LXNhMRowGAYDVQQLExFGb3IgRGVtbyBVc2UgT25seTEgMB4GA1UEAxMXR2xvYmFsU2lnbiBEZW1vIFJvb3QgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC1i9RNgrJ4YAATN0J4KVGZjFGQVGFdcbKvfxrt0Bfusq2g81iVrZZjqTJnPSx4g6TdVcsEXU9GWlkFXKEtZzYM4ycbwLAeJQxQDEqkV03GV8ks2Jq/6jIm2DbByPiS5fvRQFQJLYuQHqXpjpOpmPiostUsg9ydMEqcacYV22a6A6Nrb1c1B6OL+X0u9bo30K+YYSw2Ngp3Tuuj9PDk6JS/0CPLcLo8JIFFc8t78lPDquNAOqTDwY/HTw4751iqLVem9q3EDKEeUS+x4gqsCD2pENA7PlQBza55BGOi/A+UAsmfee1oq2Glo9buXBgX+oJ3HnyelzJU9Ej4+yfH7rcvAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBTqD8ID9OxgG83HZJVtOQMmftrrLzANBgkqhkiG9w0BAQsFAAOCAQEAAECKKpL0A2I+hsY881tIz7WqkLDuLh/ISzRVdsALYAxLhVDUHPckh5XyVRkpbTmirn+b5MpuwAI2R8A7Ld6aWWiibc7zGEZNvEKsUEYoJoYR0fuQs2cF7egiYjhFwFMX75w+kuI0Yelm3/3+BiJVtAXqmnQ4yRpGXqNJ4mQC8yWgQbZCLUpH/nqeQANeoaDr5Yg8IOuHRQzG6YNt/Cl9CetDd8WPrAkGm3T2iG0dXQ48VgkkXcNDtY+55nYjIO+N7i+WTh1fe3ArGxHBR3E44+WoA8ntfI1g65+GR0s6G8M7oS+kAFXIwugUGYEnTWp0m5bAn5NlD314IEOg4mnS8Q==";

    it("read", () => {
      const cert = new X509Certificate(Convert.FromBase64(pem));
      assert.strictEqual(cert.serialNumber, "4844dcc6d4700ffab37f416356f1");
      assert.strictEqual(cert.subject, "C=BE, O=GlobalSign nv-sa, OU=For Demo Use Only, CN=GlobalSign Demo Root CA");
      assert.strictEqual(cert.issuer, "C=BE, O=GlobalSign nv-sa, OU=For Demo Use Only, CN=GlobalSign Demo Root CA");
      assert.strictEqual(cert.extensions.length, 3);
    });

    it("verify", async () => {
      const cert = new X509Certificate(Convert.FromBase64(pem));
      const ok = await cert.verify({ date: new Date(2020, 5, 7) });
      assert.strictEqual(ok, true);
    });
  });

  context("X509 certificate generator", () => {

    it("generate self-signed certificate", async () => {
      const alg: RsaHashedKeyGenParams = {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
        publicExponent: new Uint8Array([1, 0, 1]),
        modulusLength: 2048,
      };
      const keys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]) as CryptoKeyPair;
      const cert = await X509CertificateGenerator.create({
        serialNumber: "01",
        subject: "CN=Test",
        issuer: "CN=Test",
        notBefore: new Date("2020/01/01"),
        notAfter: new Date("2020/01/02"),
        signingAlgorithm: alg,
        publicKey: keys.publicKey,
        signingKey: keys.privateKey,
      });
      const ok = await cert.verify({ date: new Date("2020/01/01 12:00") });
      assert.strictEqual(ok, true);
    });

    it.only("generate ca and user certificate", async () => {
      const alg: EcdsaParams & EcKeyGenParams = {
        name: "ECDSA",
        hash: "SHA-256",
        namedCurve: "P-256",
      };
      const caKeys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]) as CryptoKeyPair;
      const caCert = await X509CertificateGenerator.create({
        serialNumber: "01",
        subject: "CN=Test CA",
        issuer: "CN=Test CA",
        notBefore: new Date("2020/01/01"),
        notAfter: new Date("2020/01/03"),
        signingAlgorithm: alg,
        publicKey: caKeys.publicKey,
        signingKey: caKeys.privateKey,
      });

      let ok = await caCert.verify({ date: new Date("2020/01/01 12:00") });
      assert.strictEqual(ok, true);

      const userKeys = await crypto.subtle.generateKey(alg, false, ["sign", "verify"]) as CryptoKeyPair;
      const userCert = await X509CertificateGenerator.create({
        serialNumber: "01",
        subject: "CN=Test",
        issuer: caCert.issuer,
        notBefore: new Date("2020/01/01"),
        notAfter: new Date("2020/01/02"),
        signingAlgorithm: alg,
        publicKey: userKeys.publicKey,
        signingKey: caKeys.privateKey,
      });

      ok = await userCert.verify({
        date: new Date("2020/01/01 12:00"),
        publicKey: await caCert.getPublicKey()
      });
      assert.strictEqual(ok, true);
    });

  });

});