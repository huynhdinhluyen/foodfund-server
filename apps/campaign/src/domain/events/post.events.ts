export interface PostLikeEvent {
    postId: string
    postTitle: string
    postAuthorId: string
    likerId: string
    likerName: string
    likeCount: number
}

export interface PostCommentEvent {
    commentId: string
    postId: string
    postTitle: string
    postAuthorId: string
    commenterId: string
    commenterName: string
    commentPreview: string
}

export interface PostReplyEvent {
    replyId: string
    postId: string
    postTitle: string
    parentCommentId: string
    parentCommentAuthorId: string
    replierId: string
    replierName: string
    replyPreview: string
}