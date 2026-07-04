import { Category, Exercise } from '../../types';

export interface CategoryAccordionProps {
  category: Category;
  exercises: Exercise[];
  onStartExercise: (categoryId: string) => void;
  onEditCategory: (categoryId: string) => void;
  editMode?: boolean;
  onLongPressActivate?: () => void;
  onDrag?: () => void;
  isDragging?: boolean;
  onDelete?: (id: string, title: string) => void;
  onToggleActive?: (id: string, title: string, status: number) => void;
}
