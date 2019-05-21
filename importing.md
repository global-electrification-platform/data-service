# Global Electrification Platform

This document will guide you through the process of importing the a model into GEP.

**If the setup was already complete you can skip to the Import Model section**

### Hardware requirements

The scenarios need to be processed by the the GEP command line tool to be imported. Because of this there are some requirement about the characteristing of the machine where the import process is going to run:

-   250GB of free space*
    
-   4GB of RAM (if using aws a t2.medium is recommended)
    

* The needed space is roughly twice the size of the all the scenarios uncompressed.

### Software requirements

There are several tools involved in the import process, all executed through the command line:

-   AWS CLI (https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
    
-   unzip
    
-   node v8. Installation through nvm is recommended (https://github.com/creationix/nvm)
    
-   git (recommended, although it is possible to download the gep-data-service directly from github)
    
-   gep-data-service - See below for setup
    

### Data Service setup

The gep-data-service contains the CLI that processes/imports the data into the database.

1.  Clone the repo from github. `git clone git@github.com:global-electrification-platform/gep-data-service.git`
    
2.  Enter the project folder `cd gep-data-service`
    
3.  Run `nvm install` followed by `npm install`
    

## Import Model

**Note:** Since the gep-data-service CLI is needed to import the data it is a good idea to work inside its folder.

**Note 2:** As an example we'll use `mw-1`. Whenever this appears it must be replaced with the actual model id being imported.

1.  Create a folder for the different files using your model id.
    
    Use`mkdir mw-1`
    
2.  Enter the folder (`cd mw-1`) and download all the files from s3. The files are stored in a bucket under the following folder structure: `s3://wbg-geography01/GEP/models/<modelId>/explorer/`. Inside this folder there will be one `.zip` file per scenario and a config file `.yml` for the model.
    
    Use `aws s3 cp --recursive s3://wbg-geography01/GEP/models/mw-1/explorer/ .`
    
3.  Unzip all `.zip` files to get the scenarios, and then remove the zips to cleanup.
    
    Use `unzip \*.zip` and `rm *.zip`
    
4.  Set the environment variable `PG_CONNECTION_STRING` to the connection string of the database you're working with.
    
    Use `export PG_CONNECTION_STRING=postgresql://username:password@host:5432/database`
    
5.  Run the import. The command assumes you're inside the folder with the data files and config. Depending on the size of each scenario this process can take several hours.
    
    Use `npm run gep -- ingest .`
    

**Note 3:** These steps are used to import a new model into the database. To replace or update an existent module see the CLI's help text with `npm run gep --help`

* * *

## Local instance setup

To run an instance of the Global Electrification platform, you'll need to setup the **data-service** and the **explorer**. This guide will walk you through the process.

The [Hardware](#hardware-requirements) and [Software Requirements](#software-requirements) are the ones outlined above with the addition of:

-   Docker (https://www.docker.com/)
    

### Data Service (backend application)

1.  Follow the steps outlined in "[Data Service setup](#data-service-setup)".
    
2.  Prepare the local database.
    
    Use `npm run start-dev-db` and then `npm run migrate-dev-db`.
    
3.  Prepare the model data following the steps 1-3 of "[Import Model](#import-model)"
    
4.  Import into the database. The command assumes you're inside the folder with the data files and config. Since we're using a local database there's no need to set a connection string. Depending on the size of each scenario this process can take several hours.
    
    Use `npm run gep -- --use-config-db ingest .`
    
5.  Start the data service.
    
    Use `npm start`
    

**Note:** The next time you want to start the data service, it is only needed to start the database and the application itself. Use `npm run start-dev-db` and `npm start`.

### Explorer (frontend application)

1.  Start a new command line instance.
    
2.  Clone the repo from github. `git clone git@github.com:global-electrification-platform/gep-explorer.git`
    
3.  Enter the project folder `cd gep-explorer`
    
4.  Run `nvm install` followed by `yarn`
    
5.  Start the app with `yarn serve`. Once the application is installed this is the only command needed.
    
6.  Open the browser at `http://localhost:9000/