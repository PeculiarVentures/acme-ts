import { AlgorithmIdentifier } from "@peculiar/asn1-x509";
import * as asn1Ecc from "@peculiar/asn1-ecc";
import { container, injectable } from "tsyringe";
import { diAlgorithm, IAlgorithm } from "./algorithm";
import { HashedAlgorithm } from "./types";

@injectable()
export class EcAlgorithm implements IAlgorithm {

  public toAsnAlgorithm(alg: HashedAlgorithm): AlgorithmIdentifier | null {
    switch (alg.name.toLowerCase()) {
      case "ecdsa":
        switch (alg.hash.name.toLowerCase()) {
          case "sha-1":
            return new AlgorithmIdentifier({ algorithm: asn1Ecc.id_ecdsaWithSHA1, parameters: null });
          case "sha-256":
            return new AlgorithmIdentifier({ algorithm: asn1Ecc.id_ecdsaWithSHA256, parameters: null });
          case "sha-384":
            return new AlgorithmIdentifier({ algorithm: asn1Ecc.id_ecdsaWithSHA384, parameters: null });
          case "sha-512":
            return new AlgorithmIdentifier({ algorithm: asn1Ecc.id_ecdsaWithSHA512, parameters: null });
        }
    }
    return null;
  }

  public toWebAlgorithm(alg: AlgorithmIdentifier): HashedAlgorithm | null {
    switch (alg.algorithm) {
      case asn1Ecc.id_ecdsaWithSHA1:
        return { name: "ECDSA", hash: { name: "SHA-1" } };
      case asn1Ecc.id_ecdsaWithSHA256:
        return { name: "ECDSA", hash: { name: "SHA-256" } };
      case asn1Ecc.id_ecdsaWithSHA384:
        return { name: "ECDSA", hash: { name: "SHA-384" } };
      case asn1Ecc.id_ecdsaWithSHA512:
        return { name: "ECDSA", hash: { name: "SHA-512" } };
    }
    return null;
  }

}

container.registerSingleton(diAlgorithm, EcAlgorithm);