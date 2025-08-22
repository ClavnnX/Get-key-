# API Key Service

## Overview

This is a simple Express.js API service that generates and manages temporary API keys. The service assigns unique 10-character alphanumeric keys to IP addresses with expiration functionality. It's designed to be deployed on Vercel and uses in-memory storage for key management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Components

**Web Framework**: Express.js 5.1.0 serves as the foundation for the REST API, providing middleware support and routing capabilities.

**Key Generation**: Uses Node.js crypto module for secure random key generation. Keys are 10-character strings using uppercase letters and numbers (A-Z, 0-9).

**Storage Strategy**: In-memory storage using JavaScript objects to store key data mapped to IP addresses. Each stored entry contains the key, expiration date, and creation timestamp.

**IP Address Detection**: Implements comprehensive IP address detection that handles various proxy scenarios including Vercel's deployment environment. Supports x-forwarded-for, x-real-ip headers, and direct connection addresses.

**Key Management**: 
- One key per IP address policy
- Automatic expiration handling
- Key replacement when expired or new key requested

### Request Processing

**Middleware Stack**: 
- JSON body parsing for request handling
- Custom IP detection middleware that extracts real client IP addresses
- Support for comma-separated IP lists in forwarded headers

**Security Considerations**: Uses cryptographically secure random number generation for key creation rather than Math.random().

## External Dependencies

**Runtime Dependencies**:
- express (^5.1.0): Web application framework
- cors (^2.8.5): Cross-Origin Resource Sharing middleware

**Deployment Platform**: 
- Vercel: Serverless deployment platform
- @vercel/node: Vercel's Node.js runtime for serverless functions

**No Database**: Currently uses in-memory storage, meaning keys are lost on server restart. This is suitable for temporary key scenarios but may need persistent storage for production use cases.

**No Authentication**: The service operates without user authentication, relying solely on IP-based key assignment.
