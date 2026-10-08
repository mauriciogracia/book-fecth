import { FileAction } from '../enums/FileAction.js';
import { FolderAction } from '../enums/FolderAction.js';

export interface InternalCommand {
  command: string; //the internal command string for example "/file" or "/folder"
  action: FileAction | FolderAction; //create, rename, delete, list, move, etc
}