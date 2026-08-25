# Security

## Report a vulnerability privately

Please do not publish exploit details in an issue, discussion, pull request or
social post. Use the repository host's private vulnerability-reporting channel
when one is available. If it is not available, use Enoki Limited's currently
published contact method to ask for a private reporting channel before sending
sensitive details.

Include:

- the affected version or commit;
- the browser and operating system used;
- steps to reproduce the issue with harmless test data;
- the security impact; and
- any suggested mitigation.

Do not send secrets, personal data or data taken from another system.

## Scope

Reports are in scope when they identify a security weakness in this
repository's code, dependency use or published build. A dependency advisory is
most useful when it explains how this application reaches the vulnerable code.

Challenge scoring, general feature requests, content corrections and the
absence of an experimental browser API are not security vulnerabilities.

## Safe testing

Test only a copy that you own or have explicit permission to assess. Do not
probe Open for Agents production services, third-party services, real accounts
or real spacecraft systems. Avoid denial of service, social engineering,
persistence, destructive actions and access to other people's data.

This project is a browser-based simulation. It has no authority over a real
spacecraft or production control system.

We will assess a report before discussing disclosure timing. This project does
not promise a bug bounty or a particular response time.
