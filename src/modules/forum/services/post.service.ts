import { DataSource, Repository } from 'typeorm';

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { FarmerProfile } from '@modules/user/entities/farmer-profile.entity';
import { User } from '@modules/user/entities/user.entity';

import {
  CreatePostDTO,
  GetPostsQueryDTO,
  UpdatePostDTO,
} from '../dto/post.dto';
import { Comment } from '../entities/comment.entity';
import { PostVote } from '../entities/post-vote.entity';
import { Post } from '../entities/post.entity';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly dataSource: DataSource,
  ) {}

  async createPost(dto: CreatePostDTO, authorId: string): Promise<Post> {
    const post = this.postRepository.create({
      authorId,
      content: dto.content,
      images: dto.images || [],
      tags: dto.tags || [],
    });
    return this.postRepository.save(post);
  }

  async getPostsFeed(query: GetPostsQueryDTO, currentUserId?: string) {
    const limit = query.limit || 10;
    const sort = query.sort || 'new';

    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('author.farmerProfile', 'farmerProfile')
      .leftJoinAndSelect('author.adminProfile', 'adminProfile');

    // Filter by tag if provided (tags is JSONB array)
    if (query.tag) {
      queryBuilder.andWhere('post.tags ::jsonb @> :tagFilter::jsonb', {
        tagFilter: JSON.stringify([query.tag]),
      });
    }

    // DISTINCT ON subquery for highest-scoring root comment (topComment)
    queryBuilder.leftJoin(
      (qb) => {
        return qb
          .select('c.id', 'id')
          .distinctOn(['c.post_id'])
          .addSelect('c.content', 'content')
          .addSelect('c.upvotes', 'upvotes')
          .addSelect('c.downvotes', 'downvotes')
          .addSelect('c.author_id', 'author_id')
          .addSelect('c.created_at', 'created_at')
          .addSelect('c.post_id', 'post_id')
          .addSelect('u.username', 'author_username')
          .addSelect('fp.first_name', 'author_first_name')
          .addSelect('fp.last_name', 'author_last_name')
          .from(Comment, 'c')
          .leftJoin(User, 'u', 'u.id = c.author_id')
          .leftJoin(FarmerProfile, 'fp', 'fp.user_id = u.id')
          .where('c.parent_id IS NULL')
          .andWhere('c.deleted_at IS NULL')
          .andWhere('(c.upvotes - c.downvotes) > 0')
          .orderBy('c.post_id')
          .addOrderBy('(c.upvotes - c.downvotes)', 'DESC')
          .addOrderBy('c.created_at', 'ASC');
      },
      'tc',
      'tc.post_id = post.id',
    );

    queryBuilder
      .addSelect('tc.id', 'tc_id')
      .addSelect('tc.content', 'tc_content')
      .addSelect('tc.upvotes', 'tc_upvotes')
      .addSelect('tc.downvotes', 'tc_downvotes')
      .addSelect('(tc.author_id)', 'tc_authorId')
      .addSelect('(tc.created_at)', 'tc_createdAt')
      .addSelect('(tc.author_username)', 'tc_authorUsername')
      .addSelect('(tc.author_first_name)', 'tc_authorFirstName')
      .addSelect('(tc.author_last_name)', 'tc_authorLastName');

    // Attach userVote if user is authenticated
    if (currentUserId) {
      queryBuilder
        .leftJoin(
          'post_votes',
          'currentUserVote',
          'currentUserVote.post_id = post.id AND currentUserVote.user_id = :currentUserId',
          { currentUserId },
        )
        .addSelect('currentUserVote.type', 'userVote');
    }

    // Cursor-based Pagination
    if (sort === 'hot') {
      if (query.cursor) {
        const decoded = Buffer.from(query.cursor, 'base64').toString('ascii');
        const [scoreStr, createdAtStr, id] = decoded.split('_');
        const cursorScore = parseInt(scoreStr, 10);
        const cursorCreatedAt = new Date(createdAtStr);

        queryBuilder.andWhere(
          `(post.score < :cursorScore) OR 
           (post.score = :cursorScore AND post.created_at < :cursorCreatedAt) OR 
           (post.score = :cursorScore AND post.created_at = :cursorCreatedAt AND post.id < :cursorId)`,
          { cursorScore, cursorCreatedAt, cursorId: id },
        );
      }
      queryBuilder
        .orderBy('post.score', 'DESC')
        .addOrderBy('post.createdAt', 'DESC')
        .addOrderBy('post.id', 'DESC');
    } else {
      // sort === 'new'
      if (query.cursor) {
        const decoded = Buffer.from(query.cursor, 'base64').toString('ascii');
        const [createdAtStr, id] = decoded.split('_');
        const cursorCreatedAt = new Date(createdAtStr);

        queryBuilder.andWhere(
          `(post.created_at < :cursorCreatedAt) OR 
           (post.created_at = :cursorCreatedAt AND post.id < :cursorId)`,
          { cursorCreatedAt, cursorId: id },
        );
      }
      queryBuilder
        .orderBy('post.createdAt', 'DESC')
        .addOrderBy('post.id', 'DESC');
    }

    // Limit to load 1 extra item to check for next page availability
    queryBuilder.take(limit + 1);

    const { entities, raw } = await queryBuilder.getRawAndEntities();

    const hasNextPage = entities.length > limit;
    const items = hasNextPage ? entities.slice(0, limit) : entities;

    const mappedItems = items.map((entity) => {
      // Resolve raw row for additional fields
      const rawItem = raw.find(
        (r) =>
          r.post_id === entity.id ||
          r.id === entity.id ||
          r.post_id_original === entity.id,
      );

      // Attach userVote
      entity['userVote'] = rawItem ? rawItem.userVote || null : null;

      // Attach topComment
      if (rawItem && rawItem.tc_id) {
        entity['topComment'] = {
          id: rawItem.tc_id,
          content: rawItem.tc_content,
          upvotes: parseInt(rawItem.tc_upvotes, 10) || 0,
          downvotes: parseInt(rawItem.tc_downvotes, 10) || 0,
          authorId: rawItem.tc_authorId,
          createdAt: new Date(rawItem.tc_createdAt),
          author: {
            id: rawItem.tc_authorId,
            username: rawItem.tc_authorUsername,
            farmerProfile: rawItem.tc_authorFirstName
              ? {
                  firstName: rawItem.tc_authorFirstName,
                  lastName: rawItem.tc_authorLastName,
                }
              : null,
          },
        };
      } else {
        entity['topComment'] = null;
      }

      return entity;
    });

    let nextCursor: string | null = null;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      if (sort === 'hot') {
        const payload = `${lastItem.score}_${lastItem.createdAt.toISOString()}_${lastItem.id}`;
        nextCursor = Buffer.from(payload).toString('base64');
      } else {
        const payload = `${lastItem.createdAt.toISOString()}_${lastItem.id}`;
        nextCursor = Buffer.from(payload).toString('base64');
      }
    }

    return {
      items: mappedItems,
      nextCursor,
    };
  }

  async getPostById(postId: string, currentUserId?: string): Promise<Post> {
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('author.farmerProfile', 'farmerProfile')
      .leftJoinAndSelect('author.adminProfile', 'adminProfile')
      .where('post.id = :postId', { postId });

    // DISTINCT ON subquery for highest-scoring root comment (topComment)
    queryBuilder.leftJoin(
      (qb) => {
        return qb
          .select('c.id', 'id')
          .distinctOn(['c.post_id'])
          .addSelect('c.content', 'content')
          .addSelect('c.upvotes', 'upvotes')
          .addSelect('c.downvotes', 'downvotes')
          .addSelect('c.author_id', 'author_id')
          .addSelect('c.created_at', 'created_at')
          .addSelect('c.post_id', 'post_id')
          .addSelect('u.username', 'author_username')
          .addSelect('fp.first_name', 'author_first_name')
          .addSelect('fp.last_name', 'author_last_name')
          .from(Comment, 'c')
          .leftJoin(User, 'u', 'u.id = c.author_id')
          .leftJoin(FarmerProfile, 'fp', 'fp.user_id = u.id')
          .where('c.parent_id IS NULL')
          .andWhere('c.deleted_at IS NULL')
          .andWhere('(c.upvotes - c.downvotes) > 0')
          .orderBy('c.post_id')
          .addOrderBy('(c.upvotes - c.downvotes)', 'DESC')
          .addOrderBy('c.created_at', 'ASC');
      },
      'tc',
      'tc.post_id = post.id',
    );

    queryBuilder
      .addSelect('tc.id', 'tc_id')
      .addSelect('tc.content', 'tc_content')
      .addSelect('tc.upvotes', 'tc_upvotes')
      .addSelect('tc.downvotes', 'tc_downvotes')
      .addSelect('(tc.author_id)', 'tc_authorId')
      .addSelect('(tc.created_at)', 'tc_createdAt')
      .addSelect('(tc.author_username)', 'tc_authorUsername')
      .addSelect('(tc.author_first_name)', 'tc_authorFirstName')
      .addSelect('(tc.author_last_name)', 'tc_authorLastName');

    if (currentUserId) {
      queryBuilder
        .leftJoin(
          'post_votes',
          'currentUserVote',
          'currentUserVote.post_id = post.id AND currentUserVote.user_id = :currentUserId',
          { currentUserId },
        )
        .addSelect('currentUserVote.type', 'userVote');
    }

    const { entities, raw } = await queryBuilder.getRawAndEntities();
    const entity = entities[0];

    if (!entity) {
      throw new NotFoundException('Post not found');
    }

    const rawItem = raw[0];
    entity['userVote'] = rawItem ? rawItem.userVote || null : null;

    if (rawItem && rawItem.tc_id) {
      entity['topComment'] = {
        id: rawItem.tc_id,
        content: rawItem.tc_content,
        upvotes: parseInt(rawItem.tc_upvotes, 10) || 0,
        downvotes: parseInt(rawItem.tc_downvotes, 10) || 0,
        authorId: rawItem.tc_authorId,
        createdAt: new Date(rawItem.tc_createdAt),
        author: {
          id: rawItem.tc_authorId,
          username: rawItem.tc_authorUsername,
          farmerProfile: rawItem.tc_authorFirstName
            ? {
                firstName: rawItem.tc_authorFirstName,
                lastName: rawItem.tc_authorLastName,
              }
            : null,
        },
      };
    } else {
      entity['topComment'] = null;
    }

    return entity;
  }

  async updatePost(
    postId: string,
    dto: UpdatePostDTO,
    userId: string,
    isAdmin: boolean,
  ): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!isAdmin && post.authorId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to update this post',
      );
    }

    if (dto.content !== undefined) post.content = dto.content;
    if (dto.images !== undefined) post.images = dto.images;
    if (dto.tags !== undefined) post.tags = dto.tags;

    return this.postRepository.save(post);
  }

  async votePost(
    postId: string,
    userId: string,
    type: 'up' | 'down' | 'none',
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(Post, { where: { id: postId } });
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      const existingVote = await manager.findOne(PostVote, {
        where: { postId, userId },
      });

      if (existingVote) {
        if (type === 'none' || existingVote.type === type) {
          // HỦY VOTE
          await manager.remove(existingVote);
          if (existingVote.type === 'up') {
            await manager.decrement(Post, { id: postId }, 'upvotes', 1);
            await manager.decrement(Post, { id: postId }, 'score', 1);
          } else {
            await manager.decrement(Post, { id: postId }, 'downvotes', 1);
          }
        } else {
          // ĐỔI VOTE
          existingVote.type = type;
          await manager.save(existingVote);
          if (type === 'up') {
            await manager.increment(Post, { id: postId }, 'upvotes', 1);
            await manager.increment(Post, { id: postId }, 'score', 1);
            await manager.decrement(Post, { id: postId }, 'downvotes', 1);
          } else {
            await manager.decrement(Post, { id: postId }, 'upvotes', 1);
            await manager.decrement(Post, { id: postId }, 'score', 1);
            await manager.increment(Post, { id: postId }, 'downvotes', 1);
          }
        }
      } else {
        // VOTE MỚI
        if (type !== 'none') {
          const newVote = manager.create(PostVote, { postId, userId, type });
          await manager.save(newVote);
          if (type === 'up') {
            await manager.increment(Post, { id: postId }, 'upvotes', 1);
            await manager.increment(Post, { id: postId }, 'score', 1);
          } else {
            await manager.increment(Post, { id: postId }, 'downvotes', 1);
          }
        }
      }
    });
  }

  async softDeletePost(
    postId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (!isAdmin && post.authorId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to delete this post',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      // Soft-delete post
      await manager.softDelete(Post, postId);

      // Explicitly soft delete all associated comments to prevent orphaned threads
      await manager
        .createQueryBuilder()
        .update(Comment)
        .set({ deletedAt: new Date() })
        .where('postId = :postId', { postId })
        .andWhere('deletedAt IS NULL')
        .execute();
    });
  }
}
