// Model representing a book entity - SAMPLE
export class BookModel {
  id: number;
  title: string;
  author: string;
  publishedDate: Date;
  isbn: string;

  constructor(
    id: number,
    title: string,
    author: string,
    publishedDate: Date,
    isbn: string,
  ) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.publishedDate = publishedDate;
    this.isbn = isbn;
  }
}
