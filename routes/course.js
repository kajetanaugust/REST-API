const express = require('express');
const Course = require('../models').Course;
const User = require('../models').User;


const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');
const { check, validationResult } = require('express-validator');

// Construct a router instance.
const router = express.Router();


// Authenticate User Middleware
const authenticateUser =  async (req, res, next) => {

    let message = null;

    // Parse the user's credentials from the Authorization header.
    const credentials = auth(req);

    // If the user's credentials are available...
    if (credentials) {
        // Attempt to retrieve the user from the data store
        // by their username (i.e. the user's "key"
        // from the Authorization header).
        const user = await User.findOne({
            where: {emailAddress: credentials.name}
        });

        // If a user was successfully retrieved from the data store...
        if (user) {
            // Use the bcryptjs npm package to compare the user's password
            // (from the Authorization header) to the user's password
            // that was retrieved from the data store.
            const authenticated = bcryptjs
                .compareSync(credentials.pass, user.password);


            // If the passwords match...
            if (authenticated) {
                console.log(`Authentication successful for username: ${user.emailAddress}`);

                // Then store the retrieved user object on the request object
                // so any middleware functions that follow this middleware function
                // will have access to the user's information.
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

    // If user authentication failed...
    if (message) {
        console.warn(message);

        // Return a response with a 401 Unauthorized HTTP status code.
        res.status(401).json({ message: 'Access Denied, Please Log in' });
    } else {
        // Or if user authentication succeeded...
        // Call the next() method.
        next();
    }
};



//ASYNC HANDLER

function asyncHandler(cb){
    return async(req, res, next) => {
        try {
            await cb(req, res, next)
        } catch(error){
            res.status(500).send(error);
        }
    }
}


////////////
// ROUTES //
////////////


// GET route for getting all courses
router.get('/courses', asyncHandler(async(req, res) => {
    try{
        const courseList = await Course.findAll({ order: [[ "createdAt", "DESC" ]],
                attributes:['id', 'title', 'description', 'estimatedTime', 'materialsNeeded', 'userId'], //filtering response attributes
        })
        res.json(courseList);

    }catch(error) {
        res.json({message: error.message}).status(404)
    }
}))



// GET route for getting individual courses
router.get('/courses/:id', asyncHandler(async (req, res) => {
    try{
        const chosenCourse = await Course.findByPk(req.params.id);
        if(chosenCourse){
            res.json({ // filtering response attributes
                id: chosenCourse.id,
                title: chosenCourse.title,
                description: chosenCourse.description,
                estimatedTime: chosenCourse.estimatedTime,
                materialsNeeded: chosenCourse.materialsNeeded,
                userId: chosenCourse.userId
            });
        } else {
            res.sendStatus(404)
        }
    }catch(error) {
        res.json({message: error.message}).status(404)
    }
}))



// POST route for adding new course
router.post('/courses',[
    check('title')// checking title
        .exists({ checkNull: true})
        .withMessage('Please provide a "title"'),
    check('description')// checking description
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a "description"'),

], authenticateUser, asyncHandler(async (req, res, next) => { // POST route authentication
    const authenticationErrors = validationResult(req);
    try {
        // If there are validation errors...
        if (!authenticationErrors.isEmpty()) {
            // Use the Array `map()` method to get a list of error messages.
            const errorMessages = authenticationErrors.array().map(error => error.msg);

            // Return the validation errors to the client.
            return res.status(400).json({errors: errorMessages});
        }
            let course;
            course = await Course.create(req.body);
            const newId = course.id;
            res.location(`/courses/${newId}`).status(201).end();

    }catch(error){
        throw error;
    }

}))



// PUT route for updating course info
router.put('/courses/:id',[
    check('title') // checking title
        .exists({ checkNull: true})
        .withMessage('Please provide a "title"'),
    check('description') // checking description
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('Please provide a "description"'),

], authenticateUser, asyncHandler(async (req, res, next) => { // PUT route authentication
    const authenticationErrors = validationResult(req);
    try {
        // If there are validation errors...
        if (!authenticationErrors.isEmpty()) {
            // Use the Array `map()` method to get a list of error messages.
            const errorMessages = authenticationErrors.array().map(error => error.msg);

            // Return the validation errors to the client.
            return res.status(400).json({errors: errorMessages});
        }

        let selectedCourse;
        const activeUser = req.currentUser; // getting active user
        selectedCourse = await Course.findByPk(req.params.id); // selecting course

        if(selectedCourse){// checking if selected course exists
            if(activeUser.id === selectedCourse.userId) {// checking if user owns the course
                await selectedCourse.update(req.body) // updating the course
                res.status(204).end();
            }else {
                return res.status(403).json({message: "You can only edit your own courses!"})// sending 403 error
            }
        }else {
            res.status(404).json({message: "Quote Not Found"})// sending 404 error
        }
        course = await Course.update(req.body); // updating course
        const newId = course.id;
        res.location(`/courses/${newId}`).status(201).end();

    }catch(error){
        throw error;
    }

}))



// DELETE route for deleting course
router.delete('/courses/:id', authenticateUser, asyncHandler(async (req, res, next) => {
    try {
        let selectedCourse;
        const activeUser = req.currentUser;// getting active user

        selectedCourse = await Course.findByPk(req.params.id)// selecting course

        if(selectedCourse){// checking if selected course exists
            if(activeUser.id === selectedCourse.userId) {// checking if user owns a course
                await selectedCourse.destroy(req.body)// deleting the course
                res.status(204).end();
            }else {
                return res.status(403).json({message: "You can only delete your own courses!"})// sending 403 error
            }
        }else {
            res.status(404).json({message: "Quote Not Found"}) // sending 404 error
        }
    }catch(error){
        throw error;
    }
}))


// exporting routes
module.exports = router;