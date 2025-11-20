import { Injectable } from "@nestjs/common"
import { NotificationType } from "@app/campaign/src/domain/enums/notification"
import { NotificationBuilder, NotificationBuilderContext, NotificationBuilderResult } from "@app/campaign/src/domain/interfaces/notification"

@Injectable()
export class PostLikeBuilder extends NotificationBuilder<NotificationType.POST_LIKE> {
    readonly type = NotificationType.POST_LIKE

    build(
        context: NotificationBuilderContext<NotificationType.POST_LIKE>,
    ): NotificationBuilderResult {
        this.validate(context.data)
        const data = context.data

        const postTitle = this.truncate(data.postTitle, 50)
        const likerName = data.latestLikerName || "Someone"

        let message: string
        if (data.likeCount === 1) {
            message = `${likerName} thích bài viết của bạn "${postTitle}"`
        } else if (data.likeCount === 2) {
            message = `${likerName} và 1 người khác thích bài viết của bạn "${postTitle}"`
        } else {
            const othersCount = this.formatNumber(data.likeCount - 1)
            message = `${likerName} và ${othersCount} người khác thích bài viết của bạn "${postTitle}"`
        }

        return {
            title: "❤️ Post Liked",
            message,
            metadata: {
                postId: data.postId,
                likeCount: data.likeCount,
                latestLikerName: likerName,
            },
        }
    }
}

/**
 * Post Comment Notification Builder
 */
@Injectable()
export class PostCommentBuilder extends NotificationBuilder<NotificationType.POST_COMMENT> {
    readonly type = NotificationType.POST_COMMENT

    build(
        context: NotificationBuilderContext<NotificationType.POST_COMMENT>,
    ): NotificationBuilderResult {
        this.validate(context.data)
        const data = context.data

        const postTitle = this.truncate(data.postTitle, 50)
        const commentPreview = this.truncate(data.commentPreview, 100)
        const message = `${data.commenterName} commented on "${postTitle}": "${commentPreview}"`

        return {
            title: "💬 New Comment",
            message,
            metadata: {
                postId: data.postId,
                commentId: data.commentId,
                commenterName: data.commenterName,
            },
        }
    }
}

/**
 * Post Reply Notification Builder
 */
@Injectable()
export class PostReplyBuilder extends NotificationBuilder<NotificationType.POST_REPLY> {
    readonly type = NotificationType.POST_REPLY

    build(
        context: NotificationBuilderContext<NotificationType.POST_REPLY>,
    ): NotificationBuilderResult {
        this.validate(context.data)
        const data = context.data

        const replyPreview = this.truncate(data.replyPreview, 100)
        const message = `${data.replierName} replied to your comment: "${replyPreview}"`

        return {
            title: "💬 New Reply",
            message,
            metadata: {
                postId: data.postId,
                commentId: data.commentId,
                parentCommentId: data.parentCommentId,
                replierName: data.replierName,
            },
        }
    }
}