# ClubVotingSystem

## About

ClubVotingSystem lets you do real-time voting in a safe and controlled environment. It was initially developed in 2022 for the Annual General Meeting (AGM) for UTS Programmers' Society.

## Features

- [x] Responsive UI
- [x] Realtime vote counting and display
- [x] User facing dashboard
- [x] Admin dashboard
- [x] Anonymous voting

## Use Cases

1. Committee election in Annual & Special General Meetings (AGMs & SGMs)
2. Voting where memberships are required

## Limitation

You can only vote & ask one question at a time.

## Get Started

### Prerequisites

Install [Docker](https://www.docker.com/)

### Steps

1. Clone the repo

```
git clone https://github.com/ProgSoc/ClubVotingSystem.git
cd ClubVotingSystem
```

2. Install dependencies

```
bun install
```

3. Run database on Docker

```
docker-compose up -d
```

4. Run client & server on localhost

```
yarn web dev
yarn server dev
```

## How to Contribute

1. Pick your favourite issue (or make one)
2. Make a comment saying you'll work on it
3. Wait for the issue to be assigned to you
4. Fork the repo
5. Commit your changes with the issue number (e.g., issue #2)
6. Make a pull request
7. Wait for approval
   1. If approved: You're done!
   2. Else: See comments

## Project Structure

```
project-root/
│
├── .gitignore
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── ...
└── src/
    ├── server/
    |   ├── src/
    │   ├── package.json
    │   └── ...
    └── web/
        ├── src/
        ├── index.html
        ├── package.json
        ├── tailwind.config.cjs
        └── ...
```
