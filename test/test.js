'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
    console.info('seeding blog data');
    const seedData = [];

    for (let i=1; i <= 10; i++) {
        seedData.push(generateBlogData());
    }
    return BlogPost.insertMany(seedData).catch(console.log);
}

function generateBlogData() {
    return {
        title: faker.lorem.words(),
        content: faker.lorem.paragraph(),
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        }
    }
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blog API resource', function() {
    before(function() {
        return runServer(TEST_DATABASE_URL)
    });
    beforeEach(function() {
        return seedBlogData();
    });
    afterEach(function() {
        return tearDownDb();
    });
    after(function() {
        return closeServer();
    });
    describe('GET endpoint', function() {
        it('should return all existing restaurants', function() {
            let res;
            return chai.request(app)
                .get('/posts')
                .then(function(_res) {
                    res = _res;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.lengthOf.at.least(1)
                    return BlogPost.count();
                })
                .then(function(count) {
                    expect(res.body).to.have.lengthOf(count);
                })
        })
    
        it('should return blogposts with the right fields', function() {
            let resBlog;
            return chai.request(app)
                .get('/posts')
                .then(function(res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('array');
                    expect(res.body).to.have.lengthOf.at.least(1);
    
                    res.body.forEach(function(post) {
                        expect(post).to.be.a('object');
                        expect(post).to.include.keys(
                            'id', 'title', 'author', 'content', 'created')
                    })
                    resBlog = res.body[0];
                    return BlogPost.findById(resBlog.id);
                })
                .then(function(post) {
                    expect(resBlog.id).to.equal(post.id);
                    expect(resBlog.title).to.equal(post.title);
                    expect(resBlog.content).to.equal(post.content);
                    expect(resBlog.author).to.contain(post.author.firstName);
                    expect(resBlog.author).to.contain(post.author.lastName);
                    // expect(resBlog.created).to.equal(post.created);
                });
        });
    });
    describe('POST endpoint', function() {
        it('should add a new blogpost', function() {
            const newPost = generateBlogData();
            return chai.request(app)
                .post('/posts')
                .send(newPost)
                .then(function(res) {
                    console.log(newPost);
                    expect(res).to.have.status(201);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('object');
                    expect(res.body).to.include.keys(
                    'id', 'title', 'content', 'author', 'created');
                    expect(res.body.id).to.not.be.null;
                    expect(res.body.author).to.contain(newPost.author.firstName);
                    expect(res.body.author).to.contain(newPost.author.lastName);
                    expect(res.body.title).to.equal(newPost.title);
                    expect(res.body.content).to.equal(newPost.content);
                    return BlogPost.findById(res.body.id);
                })
                .then(function(post) {
                    expect(post.author).to.contain(newPost.author);
                    expect(post.title).to.equal(newPost.title);
                    expect(post.content).to.equal(newPost.content);
                })
        })
    })
    describe('PUT endpoint', function() {
        it('should update fields you send over', function() {
            const updateData = {
                title: 'beep boop bop',
                content: 'I am a robot'
            };

            return BlogPost
                .findOne()
                .then(function(post) {
                    updateData.id = post.id;
                    return chai.request(app)
                        .put(`/posts/${post.id}`)
                        .send(updateData);
                })
                .then(function(res) {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(updateData.id);
                })
                .then(function(post) {
                    expect(post.title).to.equal(updateData.title)
                    expect(post.content).to.equal(updateData.content)
                });
        })
    })
    describe('DEL endpoint', function() {
        it('should delete a post by id', function() {
            let post;
            return BlogPost
                .findOne()
                .then(function(_post) {
                    post = _post;
                    return chai.request(app).delete(`/posts/${post.id}`);
                })
                .then(function(res) {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(post.id);
                })
                .then(function(_post) {
                    console.log(_post);
                    expect(_post).to.be.null;
                })
        })
    })
})


