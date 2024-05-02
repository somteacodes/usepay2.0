import Question from '#models/question'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    // Write your database queries inside the run method

    await Question.createMany([
      {
        question: 'Name of your first pet?',
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
      {
        question: 'Name of your favorite place?',
      },
      {
        question: 'Name of your favorite animal?',
      },
      {
        question: 'Name of your favorite sport?',
      },
      {
        question: 'Name of your favorite game?',
      },
      {
        question: 'Name of your favorite actor?',
      },
      {
        question: 'Name of your favorite actress?',
      },
      {
        question: 'Name of your favorite musician?',
      },
      {
        question: 'Name of your favorite artist?',
      },
      {
        question: 'Name of your favorite author?',
      },
      {
        question: 'Name of your favorite poet?',
      },
      {
        question: 'Name of your favorite comedian?',
      },
      {
        question: 'Name of your favorite politician?',
      },
      {
        question: 'Name of your favorite scientist?',
      },
      {
        question: 'Name of your favorite inventor?',
      },
      {
        question: 'Name of your favorite philosopher?',
      },
      {
        question: 'Name of your favorite mathematician?',
      },
      {
        question: 'Name of your favorite doctor?',
      },
      {
        question: 'Name of your favorite nurse?',
      },
      {
        question: 'Name of your favorite engineer?',
      },
      {
        question: 'Name of your favorite lawyer?',
      },
      {
        question: 'Name of your favorite judge?',
      },
      {
        question: 'Name of your favorite police officer?',
      },
      {
        question: 'Name of your favorite soldier?',
      },
      {
        question: 'Name of your favorite pilot?',
      },
      {
        question: 'Name of your favorite sailor?',
      },
      {
        question: 'Name of your favorite chef?',
      },
      {
        question: 'Name of your favorite farmer?',
      },
      {
        question: 'Name of your favorite teacher?',
      },
      {
        question: 'Name of your favorite pastor?',
      },
      {
        question: 'Name of your favorite imam?',
      },
      {
        question: 'Name of your favorite bishop?',
      },
      {
        question: 'Name of your favorite archbishop?',
      },
      {
        question: 'Name of your favorite cardinal?',
      },
      {
        question: 'Name of your favorite pope?',
      },
      {
        question: 'Name of your favorite prophet?',
      },
      {
        question: 'Name of your favorite apostle?',
      } 
    ])
  }
}
