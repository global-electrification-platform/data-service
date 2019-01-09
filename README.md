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

## Ingest data to production

*This process will overwrite all data in the target database, be sure to have backup.*

First, create a `config/production.yaml` with database credentials (see [config/development.yaml](config/development.yaml)).

Run migrations:

    NODE_ENV=production npm run _migrate

By default, `development` and `test` environments use data from [fixtures](fixtures) directory. To populate a production database with custom data, run the `_seed` task with `NODE_ENV` and `SOURCE_DATA_DIR` environment variables set. Example:

```
  NODE_ENV=production SOURCE_DATA_DIR=~/your-source-data-dir npm run _seed
```

## License

[MIT](LICENSE)
