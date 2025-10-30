# Shibboleth SP Server

A sample server app for the [Shibboleth Service Provider library](https://github.com/whennemuth/shibboleth-sp), providing Express.js integration and Docker deployment capabilities.

## Overview

This package serves as a test harness for the core `shibboleth-sp` library. It uses two [ExpressJs](https://expressjs.com/) components, 

- One to simulate a service that utilizes the core shibboleth-sp library to inspect incoming requests for authenticated status and communicate with the Shibboleth IDP when necessary. **EntrypointSp.ts** drives this component.
- And another to simulate the application that requires authenticated access. **EntrypointApp.ts** and **HandlerApp.ts** drive this component.

These components can be run as a docker-compose app and accessed through the browser on localhost.
See [Running Locally](./docs/run-locally.md)

## Installation

```bash
npm install shibboleth-sp-server
```

## Usage

#### Running Locally

You can use launch configurations or docker compose to run shibboleth-sp-server on your machine.
See: [**Running Locally**](./docs/run-locally.md)

#### Packaging and Installing

Package this project and import it into another npm project
See: [**Packaging and Installing**](./docs/package-and-install.md)





