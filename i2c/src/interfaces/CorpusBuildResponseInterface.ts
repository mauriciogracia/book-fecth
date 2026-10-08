import { CorpusInterface } from "./CorpusInterface";

export interface CorpusBuildResponseInterface {
  success: boolean;
  message: string;
  data: CorpusInterface[];
}
