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

Start development database:

    npm run start-dev-db

Open a new terminal and seed the database:

    npm run prepare-dev-db

Start development server with changes monitoring:

    npm run dev

Access the service at [localhost:3000](http://localhost:3000)

After developing, stop Docker database container by pressing Control-C.

### Testing

Start test database:

    npm run start-test-db

Open a new terminal and run tests:

    npm run test

After testing, stop Docker database container by pressing Control-C.

## Environment variables

Use these to setup a custom environment:

Name|Description|Default
--|--|--
`PG_CONNECTION_STRING`|PostgreSQL connection string|none
`REDIS_HOST`|Redis host|127.0.0.1
`REDIS_HOST`|Redis port|6379
`REDIS_TTL`|Redis "time-to-live" or cache duration|1 week

## Documentation

Please refer to the docs website for more information about this data service and other components of GEP:

https://global-electrification-platform.github.io/docs/

## License

[MIT](LICENSE)
