# GEP Data Service

Data service web server for Global Electrification Platform.

## Install Dependencies

To set up a development environment install the following on your system:

- [nvm](https://github.com/creationix/nvm)
- [Yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/)

Clone this repository locally and activate target Node.js version:

```
nvm install
```

Install module dependencies:

```
yarn install
```

### Development

Init development database:

    yarn init-dev-db

Start development server with changes monitoring:

    yarn dev

Access the service at [localhost:3000](http://localhost:3000)

Stop development database:

    yarn stop-dev-db

### Testing

Start test database:

    yarn init-test-db

Run tests:

    yarn test

Stop database container:

    yarn stop-test-db


## License

[MIT](LICENSE)
