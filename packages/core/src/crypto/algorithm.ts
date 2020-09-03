import { AlgorithmIdentifier } from "@peculiar/asn1-x509";
import { container } from "tsyringe";

export interface IAlgorithm {

  /**
   * Converts WebCrypto to ASN.1 algorithm algorithm
   * @param alg WebCrypto algorithm
   * @returns WebCrypto algorithm or null
   */
  toAsnAlgorithm(alg: Algorithm): AlgorithmIdentifier | null;

  /**
   * Converts ASN.1 algorithm to WebCrypto algorithm
   * @param alg ASN.1 algorithm
   * @returns ASN.1 algorithm or null
   */
  toWebAlgorithm(alg: AlgorithmIdentifier): Algorithm | null;

}

export const diAlgorithm = "crypto.algorithm";

export class AlgorithmProvider {

  public toAsnAlgorithm(alg: Algorithm): AlgorithmIdentifier {
    // prepare hashed algorithm
    const algCopy: any = { ...alg };
    if (algCopy.hash && typeof algCopy.hash === "string") {
      algCopy.hash = { name: algCopy.hash };
    }

    const algorithms = container.resolveAll<IAlgorithm>(diAlgorithm);
    for (const algorithm of algorithms) {
      const res = algorithm.toAsnAlgorithm(alg);
      if (res) {
        return res;
      }
    }
    throw new Error(`Cannot convert WebCrypto algorithm to ASN.1 algorithm`);
  }

  public toWebAlgorithm(alg: AlgorithmIdentifier): Algorithm {
    const algorithms = container.resolveAll<IAlgorithm>(diAlgorithm);
    for (const algorithm of algorithms) {
      const res = algorithm.toWebAlgorithm(alg);
      if (res) {
        return res;
      }
    }
    throw new Error(`Cannot convert ASN.1 algorithm to WebCrypto algorithm`);
  }

}

export const diAlgorithmProvider = "crypto.algorithmProvider";

container.registerSingleton(diAlgorithmProvider, AlgorithmProvider);
