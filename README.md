# GEP Data Service

Data service web server for Global Electrification Platform.

## Install Dependencies

To set up a development environment install the following on your system:

- [nvm](https://github.com/creationix/nvm)
- [Docker](https://www.docker.com/)

Clone this repository locally and activate target Node.js version:

```
nvm install
```

Install Node.js dependencies:

```
npm install
```

### Development

Init development database:

    npm run init-dev-db

Start development server with changes monitoring:

    npm run dev

Access the service at [localhost:3000](http://localhost:3000)

Stop development database:

    npm run stop-dev-db

### Testing

Start test database:

    npm run init-test-db

Run tests:

    npm run test

Stop database container:

    npm run stop-test-db

## Environment variables

Use these to setup a custom enviroment:

Name|Description|Default
--|--|--
`PG_CONNECTION_STRING`|PostgreSQL connection string|none
`REDIS_HOST`|Redis host|127.0.0.1
`REDIS_HOST`|Redis port|6379
`REDIS_TTL`|Redis "Time-to-live"|1 week

## Documentation

Please refer to the docs website for more information about this data service and other components of GEP:

https://global-electrification-platform.github.io/docs/

## License

[MIT](LICENSE)
