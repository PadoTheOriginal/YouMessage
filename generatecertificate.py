from OpenSSL import crypto, SSL
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa

def cert_gen(
    emailAddress,
    commonName,
    countryName,
    localityName,
    stateOrProvinceName,
    organizationName,
    serialNumber=0,
    validityStartInSeconds=0,
    validityEndInSeconds=10*365*24*60*60,):
    #can look at generated file using openssl:
    #openssl x509 -inform pem -in selfsigned.crt -noout -text
    # create a key pair
    k = crypto.PKey()
    k.generate_key(crypto.TYPE_RSA, 2048)

    csr = crypto.X509Req()
    csr.get_subject().C = countryName
    csr.get_subject().ST = stateOrProvinceName
    csr.get_subject().L = localityName
    csr.get_subject().O = organizationName
    csr.get_subject().OU = organizationName
    csr.get_subject().CN = commonName
    csr.get_subject().emailAddress = emailAddress
    csr.set_pubkey(k)
    csr.sign(k, 'sha256')

    # create a self-signed cert
    cert = crypto.X509()
    cert.get_subject().C = countryName
    cert.get_subject().ST = stateOrProvinceName
    cert.get_subject().L = localityName
    cert.get_subject().O = organizationName
    cert.get_subject().OU = organizationName
    cert.get_subject().CN = commonName
    cert.get_subject().emailAddress = emailAddress
    cert.set_serial_number(serialNumber)
    cert.gmtime_adj_notBefore(validityStartInSeconds)
    cert.gmtime_adj_notAfter(validityEndInSeconds)
    cert.set_issuer(cert.get_subject())
    cert.set_pubkey(k)
    cert.sign(k, 'sha256')

    with open('csrrequest.csr', "wt") as f:
        f.write(crypto.dump_certificate_request(crypto.FILETYPE_PEM, csr).decode("utf-8"))

    with open('selfsigned.crt', "wt") as f:
        f.write(crypto.dump_certificate(crypto.FILETYPE_PEM, cert).decode("utf-8"))

    with open('private.key', "wt") as f:
        f.write(crypto.dump_privatekey(crypto.FILETYPE_PEM, k).decode("utf-8"))


if __name__ == '__main__':
    emailAddress = input('emailAddress: ')
    commonName = input('commonName: ')
    countryName = input('countryName: ')
    localityName = input('localityName: ')
    stateOrProvinceName = input('stateOrProvinceName: ')
    organizationName = input('organizationName: ')

    cert_gen(emailAddress, commonName, countryName, localityName, stateOrProvinceName, organizationName)