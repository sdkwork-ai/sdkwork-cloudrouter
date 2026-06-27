FROM rust:1-bookworm AS builder
WORKDIR /app
COPY . .
RUN cargo build --release -p sdkwork-mcp-api-server

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/sdkwork-mcp-app-api /usr/local/bin/
EXPOSE 18110
CMD ["sdkwork-mcp-app-api"]
