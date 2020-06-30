const express = require('express');
const { check, validationResult } = require('express-validator/check');
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');

// This array is used to keep track of user records
// as they are created.
const users = [];

/**
 * Middleware to authenticate the request using Basic Authentication.
 * @param {Request} req - The Express Request object.
 * @param {Response} res - The Express Response object.
 * @param {Function} next - The function to call to pass execution to the next middleware.
 */
const authenticateUser = (req, res, next) => {
    let message = null;

    // Get the user's credentials from the Authorization header.
    const credentials = auth(req);

    if (credentials) {
        // Look for a user whose `username` matches the credentials `name` property.
        const user = users.find(u => u.username === credentials.name);

        if (user) {
            const authenticated = bcryptjs
                .compareSync(credentials.pass, user.password);
            if (authenticated) {
                console.log(`Authentication successful for username: ${user.username}`);

                // Store the user on the Request object.
                req.currentUser = user;
            } else {
                message = `Authentication failure for username: ${user.username}`;
            }
        } else {
            message = `User not found for username: ${credentials.name}`;
        }
    } else {
        message = 'Auth header not found';
    }

    if (message) {
        console.warn(message);
        res.status(401).json({ message: 'Access Denied' });
    } else {
        next();
    }
};


const router = express.Router();



function asyncHandler(cb){
    return async(req, res, next) => {
        try {
            await cb(req, res, next)
        } catch(error){
            res.status(500).send(error);
        }
    }
}

router.get('/users', asyncHandler(async (req, res) => {
    const users =
}))