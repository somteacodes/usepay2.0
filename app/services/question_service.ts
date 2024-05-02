import Question from '#models/question'

export default class QuestionService {
  async getQuestionById(id: number): Promise<string> {
    {
      const question = await Question.findBy('id', id)
      return question!.question
    }
  }

  async getAllQuestions(): Promise<Question[]> {
    return await Question.all()
  }
}
