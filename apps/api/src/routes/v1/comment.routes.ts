import { Router } from 'express';

import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
} from '../../controllers/comment.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { attachIssueProject, requireProjectMember } from '../../middlewares/permission.middleware';

const router = Router({ mergeParams: true });

router.use(authenticate);

// /issues/:id/comments
router.post('/', attachIssueProject, requireProjectMember, createComment);
router.get('/', attachIssueProject, requireProjectMember, getComments);

// /comments/:id
router.patch('/:id', updateComment);
router.delete('/:id', deleteComment);

export default router;
