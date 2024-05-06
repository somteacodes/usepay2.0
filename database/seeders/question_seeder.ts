import Question from '#models/question'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Write your database queries inside the run method

    await Question.createMany([
      {
        question: "Name of your mother's name?",
      },
      {
        question: 'Name of your first school?',
      },
      {
        question: 'Name of your best friend?',
      },
      {
        question: 'Name of your favorite teacher?',
      },
      {
        question: 'Name of your favorite movie?',
      },
      {
        question: 'Name of your favorite book?',
      },
      {
        question: 'Name of your favorite song?',
      },
      {
        question: 'Name of your favorite food?',
      },
      {
        question: 'Name of your favorite color?',
      },
    ])
  }
}
