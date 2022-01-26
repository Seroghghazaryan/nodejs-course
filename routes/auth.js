const {Router} = require("express")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")
const {validationResult} = require("express-validator")
const nodemailer = require("nodemailer")
const User = require("../models/user")
const {EMAIL_PORT, EMAIL_HOST, EMAIL_FROM, EMAIL_PASS} = require("../keys/index")
const regEmail = require("../emails/registration")
const resetEmail = require("../emails/reset")
const {registerValidators, loginValidators} = require("../utils/validators")
const {Promise} = require("mongoose");
const router = Router()

const transporter = nodemailer.createTransport({
    port: EMAIL_PORT, host: EMAIL_HOST, tls: {
        rejectUnauthorized: false
    }, secure: true, auth: {
        user: EMAIL_FROM, pass: EMAIL_PASS
    }
})


router.get("/login", async (req, res) => {
    res.render("auth/login", {
        title: "Авторизация",
        isLogin: true,
        loginError: req.flash("loginError"),
        registerError: req.flash("registerError")
    })
})

router.get("/logout", async (req, res) => {
    req.session.destroy(() => {
        res.redirect("/auth/login")
    })
})

router.post("/login", loginValidators, async (req, res) => {
    try {
        const {candidate, password} = req.body
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash("loginError", errors.array()[0].msg)
            return res.status(422).redirect("/auth/login#login")
        }

        const areSame = await bcrypt.compare(password, candidate.password);
        if (!areSame) {
            req.flash("loginError", 'Неверный!!! пороль')
            return res.status(422).redirect("/auth/login#login")
        }

        req.session.user = candidate
        req.session.isAuthenticated = true
        req.session.save(err => {
            if (err) {
                throw err
            }
            res.redirect("/")
        })
    } catch (e) {
        console.log(e)
    }


})

router.post("/register", registerValidators, async (req, res) => {
    try {
        const {email, password, name} = req.body

        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            req.flash("registerError", errors.array()[0].msg)
            return res.status(422).redirect("/auth/login#register")
        }
        const hashPassword = await bcrypt.hash(password, 10)
        const user = new User({
            email, name, password: hashPassword, cart: {items: []}
        })
        await user.save()
        const form = regEmail(email);
        await transporter.sendMail(form);
        res.redirect("/auth/login#login")
    } catch (e) {
        console.log(e)
    }
})

router.get("/reset", async (req, res) => {
    return res.render("auth/reset", {
        title: "Забыли пароль?", error: req.flash("error")
    })
})

router.get("/password/:token", async (req, res) => {
    try {
        const user = await User.findOne({
            resetToken: req.params.token, resetTokenExp: {$gt: Date.now()}
        })

        if (!user) {
            return res.redirect("/auth/login")
        } else {
            res.render("auth/password", {
                title: "Востановить пароль!",
                error: req.flash("error"),
                userId: user._id.toString(),
                token: req.params.token
            })
        }
    } catch (e) {
        console.log(e)
    }
})

router.post("/reset", (req, res) => {
    try {
        crypto.randomBytes(32, async (err, buffer) => {
            if (err) {
                req.flash("error", "Что-то пошло не так, повторите попытку позже!")
                return res.redirect("/auth/reset")
            }

            const token = buffer.toString('hex')
            const candidate = await User.findOne({email: req.body.email})

            if (candidate) {
                candidate.resetToken = token
                candidate.resetTokenExp = Date.now() + 60 * 60 * 1000
                await candidate.save()
                await transporter.sendMail(resetEmail(candidate.email, token))
                res.redirect("/auth/login")
            } else {
                req.flash("error", "Такого email нет!")
                res.redirect("/auth/reset")
            }
        });
    } catch (e) {
        console.log(e)
    }
})

router.post("/password", async (req, res) => {
    try {
        const user = await User.findOne({
            _id: req.body.userId, resetToken: req.body.token, resetTokenExp: {$gt: Date.now()}
        })

        if (user) {
            user.password = await bcrypt.hash(req.body.password, 10)
            user.resetToken = undefined
            user.resetTokenExp = undefined
            await user.save()
            res.redirect("/auth/login")
        } else {
            req.flash("/loginError", "Время истекло")
            res.redirect("/auth/login")
        }
    } catch (e) {
        console.log(e)
    }
})

module.exports = router