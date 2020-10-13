    /**
     * <see cref="https://tools.ietf.org/html/draft-ietf-acme-acme-18#section-7.3.5"/>
     */
    export interface ChangeKey
    {
        /**
         * The URL for the account being modified.
         */
        account: string;

        /**
         * The JWK representation of the old key.
         */
        oldKey: JsonWebKey;
    }
