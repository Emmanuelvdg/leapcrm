# Official Caddy images don't bundle DNS provider plugins. Wildcard TLS
# certs (needed because every workspace gets its own <subdomain>.app.theleapcrm.com)
# require the DNS-01 challenge, which needs the GoDaddy DNS plugin compiled in.
FROM caddy:2-builder-alpine AS builder

RUN xcaddy build \
	--with github.com/caddy-dns/godaddy

FROM caddy:2-alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
