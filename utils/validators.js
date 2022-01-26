const {body} = require("express-validator")
const User = require("../models/user")

exports.registerValidators = [
    body("email")
        .isEmail().withMessage("Введен не коректный email")
        .custom(async (value, {req}) => {
            try {
                const user = await User.findOne({email: value})
                if (user) {
                    return Promise.reject("Email уже используется")
                }
            } catch (e) {
                console.log(e)
            }
        })
        .normalizeEmail(),
    body("password", "Пароль должен сожержать минимум 6 смиволов")
        .isLength({min: 6, max: 56})
        .isAlphanumeric()
        .trim(),
    body("confirm")
        .custom((value, {req}) => {
            if (value !== req.body.password) {
                throw new Error("Пароли должны совпадать")
            }
            return true
        })
        .trim(),
    body("name")
        .isLength({min: 3})
        .withMessage("Имя должен сожержать минимум 3 смиволов")
        .trim()
]

exports.loginValidators = [
    body("email")
        .isEmail().withMessage("Неверный Email")
        .custom(async (value, {req}) => {
            const user = await User.findOne({email: value})
            if (!user) {
                throw new Error("Данный пользыватель не существует");
            }
            req.body.candidate = user;
        })
        .normalizeEmail(),
    body("password", "Пароль должен сожержать минимум 6 смиволов")
        .isLength({min: 6, max: 56})
        .isAlphanumeric()
        .trim(),
]

exports.courseValidators = [
    body("title").isLength({min: 3}).withMessage("Минимальное длина названия 3 символа!").trim(),


    body("price").isNumeric().withMessage("Введтите корректную цену!"),


    body("img", "Введтите корректную URL картинки!").isURL()
]