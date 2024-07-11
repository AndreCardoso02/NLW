import nodemailer from 'nodemailer' // npm i nodemailer

export async function getMailClient() {
    const account = await nodemailer.createTestAccount() // create a fake mail server

    const transport = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: account.user,
            pass: account.pass,
        }
    })

    return transport
}