
export enum ErrorType {
  /**
   * The request specified an account that
   * does not exist
   */
  accountDoesNotExist = "urn:ietf:params:acme:error:accountDoesNotExist",
  /**
   * The request specified a certificate to
   * be revoked that has already been
   * revoked
   */
  alreadyRevoked = "urn:ietf:params:acme:error:alreadyRevoked",
  /**
   * The CSR is unacceptable (e.g., due to a
   * short key)
   */
  badCSR = "urn:ietf:params:acme:error:badCSR",
  /**
   * The client sent an unacceptable anti-
   * replay nonce
   */
  badNonce = "urn:ietf:params:acme:error:badNonce",
  /**
   * The JWS was signed by a public key the
   * server does not support
   */
  badPublicKey = "urn:ietf:params:acme:error:badPublicKey",
  /**
   * The revocation reason provided is not
   * allowed by the server
   */
  badRevocationReason = "urn:ietf:params:acme:error:badRevocationReason",
  /**
   * The JWS was signed with an algorithm
   * the server does not support
   */
  badSignatureAlgorithm = "urn:ietf:params:acme:error:badSignatureAlgorithm",
  /**
   * Certification Authority Authorization
   * (CAA) records forbid the CA from
   * issuing a certificate
   */
  caa = "urn:ietf:params:acme:error:caa",
  /**
   * Specific error conditions are indicated
   * in the "subproblems" array
   */
  compound = "urn:ietf:params:acme:error:compound",
  /**
   * The server could not connect to
   * validation target
   */
  connection = "urn:ietf:params:acme:error:connection",
  /**
   * There was a problem with a DNS query
   * during identifier validation
   */
  dns = "urn:ietf:params:acme:error:dns",
  /**
   * The request must include a value for
   * the "externalAccountBinding" field
   */
  externalAccountRequired = "urn:ietf:params:acme:error:externalAccountRequired",
  /**
   * Response received didn't match the
   * challenge's requirements
   */
  incorrectResponse = "urn:ietf:params:acme:error:incorrectResponse",
  /**
   * A contact URL for an account was
   * invalid
   */
  invalidContact = "urn:ietf:params:acme:error:invalidContact",
  /**
   * The request message was malformed
   */
  malformed = "urn:ietf:params:acme:error:malformed",
  /**
   * The request attempted to finalize an
   * order that is not ready to be finalized
   */
  orderNotReady = "urn:ietf:params:acme:error:orderNotReady",
  /**
   * The request exceeds a rate limit
   */
  rateLimited = "urn:ietf:params:acme:error:rateLimited",
  /**
   * The server will not issue certificates
   * for the identifier
   */
  rejectedIdentifier = "urn:ietf:params:acme:error:rejectedIdentifier",
  /**
   * The server experienced an internal
   * error
   */
  serverInternal = "urn:ietf:params:acme:error:serverInternal",
  /**
   * The server received a TLS error during
   * validation
   */
  tls = "urn:ietf:params:acme:error:tls",
  /**
   * The client lacks sufficient
   * authorization
   */
  unauthorized = "urn:ietf:params:acme:error:unauthorized",
  /**
   * A contact URL for an account used an
   * unsupported protocol scheme
   */
  unsupportedContact = "urn:ietf:params:acme:error:UnsupportedContact",
  /**
   * An identifier is of an unsupported type
   */
  unsupportedIdentifier = "urn:ietf:params:acme:error:unsupportedIdentifier",
  /**
   * Visit the "instance" URL and take
   * actions specified there
   */
  userActionRequired = "urn:ietf:params:acme:error:userActionRequired",
}