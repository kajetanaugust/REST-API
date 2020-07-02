const express = require('express');
const { check, validationResult } = require('express-validator');
const User = require('../models').User;
const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');


/**
 * Middleware to authenticate the request using Basic Authentication.
 * @param {Request} req - The Express Request object.
 * @param {Response} res - The Express Response object.
 * @param {Function} next - The function to call to pass execution to the next middleware.
 */
const authenticateUser = async(req, res, next) => {
    let message = null;

    // Get the user's credentials from the Authorization header.
    const credentials = auth(req);

    if (credentials) {
        // Look for a user whose `username` matches the credentials `name` property.
        const user = await User.findOne({
            where: {emailAddress: credentials.name}
        });

        if (user) {
            const authenticated = bcryptjs
                .compareSync(credentials.pass, user.password);
            if (authenticated) {
                console.log(`Authentication successful for username: ${user.emailAddress}`);

                // Store the user on the Request object.
                req.currentUser = user;
            } else {
                message = `Authentication failure for username: ${user.emailAddress}`;
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

router.get('/users', authenticateUser, asyncHandler(async (req, res) => {
    const user = req.currentUser;
    console.log(user)
    res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddress: user.emailAddress
    }).status(200);
}))

// Route that creates a new user.
router.post('/users', [
    check('firstName')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "firstName"'),
    check('lastName')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "lastName"'),
    check('emailAddress')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "email"')
        .isEmail()
        .withMessage('Please provide a valid email address for "email"'),
    check('password')
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a value for "password"'),
], asyncHandler(async(req, res) => {
    // Attempt to get the validation result from the Request object.
    const errors = validationResult(req);
    try {
        // If there are validation errors...
        if (!errors.isEmpty()) {
            // Use the Array `map()` method to get a list of error messages.
            const errorMessages = errors.array().map(error => error.msg);

            // Return the validation errors to the client.
            return res.status(400).json({errors: errorMessages});
        }

        // Get the user from the request body.
        const user = req.body;

        // Hash the new user's password.
        user.password = bcryptjs.hashSync(user.password);

        // Add the user to the `users` array.
        await User.create(user);

        // Set the status to 201 Created and end the response.
        return res.location(`/`).status(201).end();
    }catch(err) {
        res.status(500).json({message: err.message})
    }
}));

module.exports = router;