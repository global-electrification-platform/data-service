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

    npm init-dev-db

Start development server with changes monitoring:

    npm dev

Access the service at [localhost:3000](http://localhost:3000)

Stop development database:

    npm stop-dev-db

### Testing

Start test database:

    npm init-test-db

Run tests:

    npm test

Stop database container:

    npm stop-test-db


## License

[MIT](LICENSE)
