import {
  Body,
  CanActivate,
  Controller,
  Delete,
  ExecutionContext,
  Get,
  Injectable,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { User } from '@modules/user/entities/user.entity';
import { UserService } from '@modules/user/services/user.service';

import { RequestUser } from '@shared/decorators/request-user.decorator';
import { ROLE } from '@shared/enums';
import { AuthGuard } from '@shared/guards/auth.guard';
import { generateSuccessResult } from '@shared/helpers/operation-result.helper';

import {
  CreateCommentDTO,
  GetCommentsQueryDTO,
  UpdateCommentDTO,
  VoteCommentDTO,
} from '../dto/comment.dto';
import {
  CreatePostDTO,
  GetPostsQueryDTO,
  UpdatePostDTO,
  VotePostDTO,
} from '../dto/post.dto';
import { CommentService } from '../services/comment.service';
import { PostService } from '../services/post.service';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = await this.jwtService.verifyAsync(token);
        const user = await this.userService.findByID(payload.id);
        if (user) {
          request.user = { id: payload.id };
          request.activeUser = user;
        }
      } catch (err) {
        // Suppress validation error for optional authentication
      }
    }
    return true;
  }
}

@ApiTags('Forum')
@ApiBearerAuth()
@Controller('forum')
export class ForumController {
  constructor(
    private readonly postService: PostService,
    private readonly commentService: CommentService,
  ) {}

  @Get('posts')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get paginated post feed' })
  async getPostsFeed(
    @Query() query: GetPostsQueryDTO,
    @RequestUser('optional') user?: User,
  ) {
    const data = await this.postService.getPostsFeed(query, user?.id);
    return generateSuccessResult(data);
  }

  @Post('posts')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a new forum post' })
  async createPost(@Body() dto: CreatePostDTO, @RequestUser() user: User) {
    const post = await this.postService.createPost(dto, user.id);
    return generateSuccessResult(post);
  }

  @Get('posts/:id')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get detailed post by ID' })
  async getPostById(
    @Param('id') id: string,
    @RequestUser('optional') user?: User,
  ) {
    const post = await this.postService.getPostById(id, user?.id);
    return generateSuccessResult(post);
  }

  @Put('posts/:id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update post content' })
  async updatePost(
    @Param('id') id: string,
    @Body() dto: UpdatePostDTO,
    @RequestUser() user: User,
  ) {
    const isAdmin = user.role === ROLE.ADMIN;
    const post = await this.postService.updatePost(id, dto, user.id, isAdmin);
    return generateSuccessResult(post);
  }

  @Delete('posts/:id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Soft delete a post' })
  async softDeletePost(@Param('id') id: string, @RequestUser() user: User) {
    const isAdmin = user.role === ROLE.ADMIN;
    await this.postService.softDeletePost(id, user.id, isAdmin);
    return generateSuccessResult(null, 'Post deleted successfully');
  }

  @Post('posts/:id/vote')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Vote (up/down/none) a post' })
  async votePost(
    @Param('id') id: string,
    @Body() dto: VotePostDTO,
    @RequestUser() user: User,
  ) {
    await this.postService.votePost(id, user.id, dto.type);
    return generateSuccessResult(null, 'Vote updated successfully');
  }

  @Get('posts/:id/comments')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get comments of a post' })
  async getComments(
    @Param('id') id: string,
    @Query() query: GetCommentsQueryDTO,
    @RequestUser('optional') user?: User,
  ) {
    const data = await this.commentService.getCommentsForPost(
      id,
      query,
      user?.id,
    );
    return generateSuccessResult(data);
  }

  @Post('posts/:id/comments')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create comment or reply' })
  async createComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDTO,
    @RequestUser() user: User,
  ) {
    const comment = await this.commentService.createComment(id, dto, user.id);
    return generateSuccessResult(comment);
  }

  @Put('comments/:id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update a comment' })
  async updateComment(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDTO,
    @RequestUser() user: User,
  ) {
    const comment = await this.commentService.updateComment(id, dto, user.id);
    return generateSuccessResult(comment);
  }

  @Delete('comments/:id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Soft delete a comment' })
  async softDeleteComment(@Param('id') id: string, @RequestUser() user: User) {
    const isAdmin = user.role === ROLE.ADMIN;
    await this.commentService.softDeleteComment(id, user.id, isAdmin);
    return generateSuccessResult(null, 'Comment deleted successfully');
  }

  @Post('comments/:id/vote')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Vote (up/down/none) a comment' })
  async voteComment(
    @Param('id') id: string,
    @Body() dto: VoteCommentDTO,
    @RequestUser() user: User,
  ) {
    await this.commentService.voteComment(id, user.id, dto.type);
    return generateSuccessResult(null, 'Vote updated successfully');
  }
}
