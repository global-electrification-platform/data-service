# GEP Data Service

Data service web server for Global Electrification Platform.

## Development 

Node.js 8+ and Docker are required. Clone this repository locally and install dependencies with `npm install` or `yarn`. 

### Testing

Start test database in a Docker container and populate it with seed data:

  yarn init-test-db

Run tests:

  yarn test

Stop database container:

  yarn stop-test-db


## License

[MIT](LICENSE)
