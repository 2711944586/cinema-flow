export interface ReviewEntry {
  id: number;
  movieId: number;
  movieTitle: string;
  posterUrl: string;
  rating: number;
  content: string;
  author: string;
  createdAt: Date;
  likes: number;
  liked: boolean;
}
