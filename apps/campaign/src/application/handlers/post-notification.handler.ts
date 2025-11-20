import { OnEvent } from "@nestjs/event-emitter"
import { NotificationPriority, NotificationType } from "../../domain/enums/notification"
import { NotificationQueue } from "../workers/notification"
import { Injectable } from "@nestjs/common"
import { PostCommentEvent, PostLikeEvent, PostReplyEvent } from "../../domain/events"

@Injectable()
export class PostNotificationHandler {
    constructor(private readonly notificationQueue: NotificationQueue) {}

    @OnEvent("post.liked")
    async handlePostLike(event: PostLikeEvent) {
        if (event.likerId === event.postAuthorId) {
            return
        }

        await this.notificationQueue.addNotificationJob({
            eventId: `post-like-${event.postId}`,
            priority: NotificationPriority.LOW,
            type: NotificationType.POST_LIKE,
            userId: event.postAuthorId,
            actorId: event.likerId,
            entityType: "POST",
            entityId: event.postId,
            data: {
                postId: event.postId,
                postTitle: event.postTitle,
                likeCount: event.likeCount,
                latestLikerName: event.likerName,
            },
            timestamp: new Date().toISOString(),
            delaySeconds: 10,
        })
    }

    @OnEvent("post.commented")
    async handlePostComment(event: PostCommentEvent) {
        if (event.commenterId === event.postAuthorId) {
            return
        }

        await this.notificationQueue.addNotificationJob({
            eventId: `post-comment-${event.commentId}`,
            priority: NotificationPriority.MEDIUM,
            type: NotificationType.POST_COMMENT,
            userId: event.postAuthorId,
            actorId: event.commenterId,
            entityType: "COMMENT",
            entityId: event.commentId,
            data: {
                postId: event.postId,
                postTitle: event.postTitle,
                commentId: event.commentId,
                commenterName: event.commenterName,
                commentPreview: event.commentPreview,
            },
            timestamp: new Date().toISOString(),
        })
    }

    @OnEvent("comment.replied")
    async handleCommentReply(event: PostReplyEvent) {
        if (event.replierId === event.parentCommentAuthorId) {
            return
        }

        await this.notificationQueue.addNotificationJob({
            eventId: `comment-reply-${event.replyId}`,
            priority: NotificationPriority.MEDIUM,
            type: NotificationType.POST_REPLY,
            userId: event.parentCommentAuthorId,
            actorId: event.replierId,
            entityType: "COMMENT",
            entityId: event.replyId,
            data: {
                postId: event.postId,
                postTitle: event.postTitle,
                commentId: event.replyId,
                parentCommentId: event.parentCommentId,
                replierName: event.replierName,
                replyPreview: event.replyPreview,
            },
            timestamp: new Date().toISOString(),
        })
    }
}