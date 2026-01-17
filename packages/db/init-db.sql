-- WIG Database Initialization Script
-- Run automatically when PostgreSQL container starts

-- Create development database
CREATE DATABASE wig_dev;

-- Create test database
CREATE DATABASE wig_test;

-- Enable required extensions
\c wig_dev;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

\c wig_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE wig_dev TO postgres;
GRANT ALL PRIVILEGES ON DATABASE wig_test TO postgres;
