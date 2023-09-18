const funcs = require('../functions/functions')
const compiledTemplates = require('../compiledTemplates/compiledTemplates')
const socketEvents = require('../events/events')
const { Sequelize, Op, DataTypes } = require("sequelize");
const striptags = require('striptags');
const moment = require("moment")



module.exports.registerListeners = async (socket, io, ctx) => {
    console.log('a user connected ' + socket.id + " Hash " + JSON.stringify(socket.handshake.query));
    socket.on("join", async (data, callback) => {
        if (data.user_id === '') {
            console.log("killing connection user_id not received")
            socket.disconnect(true)
            return
        }
        let user_id = await ctx.wo_appssessions.findOne({
            attributes: [
                "user_id",
            ],
            where: {
                session_id: data.user_id
            }
        })
        user_id = user_id.user_id;

        let user_status = await ctx.wo_users.findOne({
            attributes: [
                "status"
            ],
            where: {
                user_id: user_id
            }
        })
        user_status = user_status.status;

        ctx.socketIdUserHash[socket.id] = data.user_id;
        ctx.userIdSocket[user_id] ? ctx.userIdSocket[user_id].push(socket) : ctx.userIdSocket[user_id] = [socket]
        ctx.userHashUserId[data.user_id] = user_id;
        ctx.userIdCount[user_id] = ctx.userIdCount[user_id] ? ctx.userIdCount[user_id] + 1 : 1
        //await funcs.Wo_LastSeen(ctx, user_id)

        if (data.recipient_ids && data.recipient_ids.length) {
            for (let recipient_id of data.recipient_ids) {
                ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]] && ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]].length ? ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]].push(recipient_id) : ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]] = [recipient_id]
            }
        }

        if (data.recipient_group_ids && data.recipient_group_ids.length) {
            for (let recipient_id of data.recipient_group_ids) {
                ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]] && ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]].length ? ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]].push(recipient_id) : ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]] = [recipient_id]
            }
        }

        await socketEvents.emitUserStatus(ctx, socket, data)
        if (user_status == 0) {
            let followers = await ctx.wo_followers.findAll({
                attributes: ["following_id"],
                where: {
                    follower_id: user_id,
                    following_id: {
                        [Op.not]: user_id
                    }
                },
                raw: true
            })

            for (let follow of followers) {
                await io.to(follow.following_id).emit("on_user_loggedin", { user_id: user_id })
            }
        }

        socket.join(user_id);
        //subscribe to all groups
        let groupIds = await funcs.getAllGroupsForUser(ctx, user_id)
        for (let groupId of groupIds) {
            socket.join("group" + groupId.group_id)
        }
        callback()
    })
    socket.on("ping_for_lastseen", async (data) => {
        if (ctx.userHashUserId[data.user_id]) {
            let userlastseen_status = await ctx.wo_users.findOne({
                attributes: [
                    "status"
                ],
                where: {
                    user_id: ctx.userHashUserId[data.user_id]
                }
            })
            if (userlastseen_status.status == 0) {
                await funcs.Wo_LastSeen(ctx, ctx.userHashUserId[data.user_id])
            }
        }
    })

    // socket.on("get_user_status", async (data) => {
    //     if (ctx.userHashUserId[data.user_id]) {
    //         await socketEvents.emitUserStatus(ctx, socket, data.user_id)
    //     }
    // })

    socket.on("close_chat", async (data) => {
        if (data.group) {
            if (ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]] && ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]].length) {
                ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]] = ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]].filter(d => d != data.recipient_id)
            }
        }
        else if (ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]] && ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]].length) {
            ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]] = ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]].filter(d => d != data.recipient_id);
            //ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]] = 0;
        }
        console.log(ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]].filter(d => d != data.recipient_id))

    })

    socket.on("is_chat_on", async (data) => {
        let last_message = {}
        if (data.message_id) {
            last_message = await ctx.wo_messages.findOne({
                where: {
                    id: data.message_id
                }
            })
        }
        let toUser = await ctx.wo_users.findOne({
            where: {
                user_id: {
                    [Op.eq]: ctx.userHashUserId[data.user_id]
                }
            }
        })
        if (data.isGroup) {
            ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]] && ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]].length ? ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]].push(data.recipient_id) : ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]] = [data.recipient_id]
        }
        else {
            ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]] && ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]].length ? ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]].push(data.recipient_id) : ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]] = [data.recipient_id]
        }

        if (ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]] && ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]].length) {
            let arr = new Set(ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]])
            ctx.userIdChatOpen[ctx.userHashUserId[data.user_id]] = Array.from(arr)
        }
        if (ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]] && ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]].length) {
            let arr = new Set(ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]])
            ctx.userIdGroupChatOpen[ctx.userHashUserId[data.user_id]] = Array.from(arr)
        }
        if (last_message.seen == 0) {
            await ctx.wo_messages.update({
                seen: Math.floor(Date.now() / 1000)
            }, {
                where: {
                    id: data.message_id
                }
            })
        }

        // let isTyping = await funcs.Wo_IsTyping(ctx, ctx.userHashUserId[data.user_id], data.recipient_id)
        // if (isTyping) {
        //     await typing(socket, sender)
        // }
        if (last_message.seen > 0) {
            await socketEvents.lastseen(ctx, socket, last_message)
        }
        else {
            await socketEvents.unseen(ctx, socket)
        }
        let user_id = ctx.userHashUserId[data.user_id]
        let unseenmessages = await funcs.Wo_CountUnseenMessages(ctx, user_id);
        await io.to(user_id).emit("messages_count", { count: unseenmessages })
       // await socketEvents.emitUserStatus(ctx, io, ctx.userHashUserId[data.user_id])
        //await socketEvents.updateMessageUsersList(ctx, io, ctx.userHashUserId[data.user_id])
    })
    socket.on("group_message", async (data, callback) => {
        if ((!data.msg || data.msg.trim() === "") && !data.mediaId) {
            console.log("Message has no text, neither media, skipping")
            return
        }
        let lastId = await ctx.wo_messages.findOne({
            limit: 1,
            attributes: ["id"],
            where: {
                [Op.or]: [
                    {
                        from_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        },
                        group_id: {
                            [Op.eq]: data.group_id
                        }
                    },
                    {
                        from_id: {
                            [Op.eq]: data.group_id
                        },
                        to_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        }
                    }
                ]
            },
            order: [['id', 'DESC']]
        })

        let groupOwnerId = await ctx.wo_groupchat.findOne({
            attributes: ["user_id"],
            where: {
                group_id: {
                    [Op.eq]: data.group_id
                }
            }
        })
        let messageOwner = await ctx.wo_users.findOne({
            where: {
                user_id: {
                    [Op.eq]: ctx.userHashUserId[data.from_id]
                }
            }
        });
        let hasHTML = false;
        let msg;
        ({ msg, hasHTML } = funcs.Wo_Emo(data.msg))
        data.msg = msg

        let nextId = (lastId && lastId.id) ? (+lastId.id + 1) : 1
        if (!data.mediaId) {
            let link_regex = new RegExp('(http\:\/\/|https\:\/\/|www\.)([^\ ]+)', 'gi');
            let mention_regex = new RegExp('@([A-Za-z0-9_]+)', 'gi');
            // let hashtag_regex = new RegExp('#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)', 'gi');

            let linkSearch = msg.match(link_regex)
            if (linkSearch && linkSearch.length > 0) {
                hasHTML = true;
                for (let linkSearchOne of linkSearch) {
                    let matchUrl = striptags(linkSearchOne)
                    let syntax = '[a]' + escape(matchUrl) + '[/a]'
                    data.msg = data.msg.replace(link_regex, syntax)
                }
            }
            let mentionSearch = msg.match(mention_regex)
            if (mentionSearch && mentionSearch.length > 0) {
                hasHTML = true;
                for (let mentionSearchOne of mentionSearch) {
                    let mention = await ctx.wo_users.findOne({
                        where: {
                            username: mentionSearchOne.substr(1, mentionSearchOne.length)
                        }
                    })
                    if (mention) {
                        let match_replace = '@[' + mention['user_id'] + ']';
                        data.msg = data.msg.replace(mention_regex, match_replace)
                    }
                }
            }
            let hashTagSearch = msg.match(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi)
            if (hashTagSearch && hashTagSearch.length > 0) {
                hasHTML = true
                for (let hashTagSearchOne of hashTagSearch) {
                    let hashdata = await funcs.Wo_GetHashtag(ctx, hashTagSearchOne.substr(1))
                    let replaceString = '#[' + hashdata['id'] + ']';
                    data.msg = data.msg.replace(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi, replaceString)
                    await ctx.wo_hashtags.update({
                        last_trend_time: Math.floor(Date.now() / 1000),
                        trend_use_num: hashdata["trend_use_num"] + 1
                    },
                        {
                            where: {
                                id: hashdata['id']
                            }
                        })
                }
            }
            let sendable_message = await funcs.Wo_Markup(ctx, data.msg);
            callback({
                status: 200,
                html: await compiledTemplates.groupListOwnerTrue(ctx, messageOwner, nextId, data, hasHTML, sendable_message, data.color)
            })
            await socketEvents.groupMessage(ctx, io, socket, data, messageOwner, nextId, hasHTML, sendable_message);
            await socketEvents.groupMessagePage(ctx, io, socket, data, messageOwner, nextId, hasHTML, sendable_message)


            // if recepient has chat open then send last seen 
            if (ctx.userIdGroupChatOpen[ctx.userHashUserId[data.from_id]] && ctx.userIdGroupChatOpen[ctx.userHashUserId[data.from_id]].filter(d => d == data.group_id) ||
                ctx.userIdExtra[data.to_id] && ctx.userIdExtra[data.to_id].active_message_group_id && +ctx.userIdExtra[data.to_id].active_message_group_id === +ctx.userHashUserId[data.from_id]) {
                await ctx.wo_messages.create({
                    from_id: ctx.userHashUserId[data.from_id],
                    group_id: data.group_id,
                    text: data.msg,
                    seen: Math.floor(Date.now() / 1000),
                    time: Math.floor(Date.now() / 1000)
                })
            }
            else {
                await ctx.wo_messages.create({
                    from_id: ctx.userHashUserId[data.from_id],
                    group_id: data.group_id,
                    text: data.msg,
                    seen: 0,
                    time: Math.floor(Date.now() / 1000)
                })
            }
        } else {
            await socketEvents.groupMessageWithMedia(ctx, io, socket, data, messageOwner, nextId, data.isSticker);
            await socketEvents.groupMessagePageWithMedia(ctx, io, socket, data, messageOwner, nextId, data.isSticker);
            await socketEvents.updateMessageGroupsList(ctx, io, messageOwner)
        }

        await socketEvents.emitUserStatus(ctx, socket, ctx.userHashUserId[data.from_id])
        await socketEvents.updateMessageGroupsList(ctx, io, ctx.userHashUserId[data.from_id])
        await socketEvents.emitUserStatus(ctx, socket, data.group_id)
    })

    socket.on("group_message_page", async (data, callback) => {

        if ((!data.msg || data.msg.trim() === "") && !data.mediaId) {
            console.log("Message has no text, neither media, skipping")
            return
        }
        let lastId = await ctx.wo_messages.findOne({
            limit: 1,
            attributes: ["id"],
            where: {
                [Op.or]: [
                    {
                        from_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        },
                        group_id: {
                            [Op.eq]: data.group_id
                        }
                    },
                    {
                        from_id: {
                            [Op.eq]: data.group_id
                        },
                        to_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        }
                    }
                ]
            },
            order: [['id', 'DESC']]
        })

        let groupOwnerId = await ctx.wo_groupchat.findOne({
            attributes: ["user_id"],
            where: {
                group_id: {
                    [Op.eq]: data.group_id
                }
            }
        })
        let messageOwner = await ctx.wo_users.findOne({
            where: {
                user_id: {
                    [Op.eq]: ctx.userHashUserId[data.from_id]
                }
            }
        });

        let hasHTML = false;
        let msg;
        ({ msg, hasHTML } = funcs.Wo_Emo(data.msg))
        data.msg = msg

        let nextId = (lastId && lastId.id) ? (+lastId.id + 1) : 1
        if (!data.mediaId) {
            let link_regex = new RegExp('(http\:\/\/|https\:\/\/|www\.)([^\ ]+)', 'gi');
            let mention_regex = new RegExp('@([A-Za-z0-9_]+)', 'gi');
            // let hashtag_regex = new RegExp('#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)', 'gi');

            let linkSearch = msg.match(link_regex)
            if (linkSearch && linkSearch.length > 0) {
                hasHTML = true;
                for (let linkSearchOne of linkSearch) {
                    let matchUrl = striptags(linkSearchOne)
                    let syntax = '[a]' + escape(matchUrl) + '[/a]'
                    data.msg = data.msg.replace(link_regex, syntax)
                }
            }
            let mentionSearch = msg.match(mention_regex)
            if (mentionSearch && mentionSearch.length > 0) {
                hasHTML = true;
                for (let mentionSearchOne of mentionSearch) {
                    let mention = await ctx.wo_users.findOne({
                        where: {
                            username: mentionSearchOne.substr(1, mentionSearchOne.length)
                        }
                    })
                    if (mention) {
                        let match_replace = '@[' + mention['user_id'] + ']';
                        data.msg = data.msg.replace(mention_regex, match_replace)
                    }
                }
            }
            let hashTagSearch = msg.match(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi)
            if (hashTagSearch && hashTagSearch.length > 0) {
                hasHTML = true
                for (let hashTagSearchOne of hashTagSearch) {
                    let hashdata = await funcs.Wo_GetHashtag(ctx, hashTagSearchOne.substr(1))
                    let replaceString = '#[' + hashdata['id'] + ']';
                    data.msg = data.msg.replace(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi, replaceString)
                    await ctx.wo_hashtags.update({
                        last_trend_time: Math.floor(Date.now() / 1000),
                        trend_use_num: hashdata["trend_use_num"] + 1
                    },
                        {
                            where: {
                                id: hashdata['id']
                            }
                        })
                }
            }
            let sendable_message = await funcs.Wo_Markup(ctx, data.msg);
            let temp = await compiledTemplates.messageListOwnerTrue(ctx, data, messageOwner, nextId, hasHTML, sendable_message, data.color)

            callback({
                status: 200,
                html: temp,
                receiver: data.to_id,
                sender: ctx.userHashUserId[data.from_id]
            })
            // callback({
            //     status: 200,
            //     html: await compiledTemplates.groupListOwnerTrue(ctx, messageOwner, nextId, data, hasHTML, sendable_message, data.color)
            // })
            // await socketEvents.groupMessage(ctx, io, socket, data, messageOwner, nextId, hasHTML, sendable_message);
            await socketEvents.groupMessage(ctx, io, socket, data, messageOwner, nextId, hasHTML, sendable_message);
            await socketEvents.groupMessagePage(ctx, io, socket, data, messageOwner, nextId, hasHTML, sendable_message)
            await socketEvents.updateMessageGroupsList(ctx, io, ctx.userHashUserId[data.from_id])
            // if recepient has chat open then send last seen 
            if (ctx.userIdGroupChatOpen[ctx.userHashUserId[data.from_id]] && ctx.userIdGroupChatOpen[ctx.userHashUserId[data.from_id]].filter(d => d == data.group_id) ||
                ctx.userIdExtra[data.to_id] && ctx.userIdExtra[data.to_id].active_message_group_id && +ctx.userIdExtra[data.to_id].active_message_group_id === +ctx.userHashUserId[data.from_id]) {
                await ctx.wo_messages.create({
                    from_id: ctx.userHashUserId[data.from_id],
                    group_id: data.group_id,
                    text: data.msg,
                    seen: Math.floor(Date.now() / 1000),
                    time: Math.floor(Date.now() / 1000)
                })
                await socketEvents.lastseen(ctx, socket, { seen: Math.floor(Date.now() / 1000) })
            }
            else {
                await ctx.wo_messages.create({
                    from_id: ctx.userHashUserId[data.from_id],
                    group_id: data.group_id,
                    text: data.msg,
                    seen: 0,
                    time: Math.floor(Date.now() / 1000)
                })
            }
        } else {
            await socketEvents.groupMessageWithMedia(ctx, io, socket, data, messageOwner, nextId, data.isSticker);
            await socketEvents.groupMessagePageWithMedia(ctx, io, socket, data, messageOwner, nextId, data.isSticker);
            await socketEvents.updateMessageGroupsList(ctx, io, ctx.userHashUserId[data.from_id])
        }

        await socketEvents.emitUserStatus(ctx, socket, ctx.userHashUserId[data.from_id])
        await socketEvents.updateMessageGroupsList(ctx, io, ctx.userHashUserId[data.from_id])
        await socketEvents.emitUserStatus(ctx, socket, data.group_id)
    })

    // Private message message page
    socket.on("private_message_page", async (data, callback) => {
        console.log(data)
        if ((!data.msg || data.msg.trim() === "") && !data.mediaId && !data.record) {
            console.log("Message has no text, neither media, skipping")
            return
        }

        let remainingSameUserSockets = []
        if (ctx.userIdSocket[ctx.userHashUserId[data.from_id]]) {
            remainingSameUserSockets = ctx.userIdSocket[ctx.userHashUserId[data.from_id]].filter(d => d.id != socket.id)
        }

        let lastId = await ctx.wo_messages.findOne({
            limit: 1,
            attributes: ["id"],
            where: {
                [Op.or]: [
                    {
                        from_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        },
                        to_id: {
                            [Op.eq]: data.to_id
                        }
                    },
                    {
                        from_id: {
                            [Op.eq]: data.to_id
                        },
                        to_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        }
                    }
                ]
            },
            order: [['id', 'DESC']]
        })
        let nextId = (lastId && lastId.id) ? (+lastId.id + 1) : 1
        let fromUser = await ctx.wo_users.findOne({
            where: {
                user_id: {
                    [Op.eq]: ctx.userHashUserId[data.from_id]
                }
            }
        })
        let toUser = await ctx.wo_users.findOne({
            where: {
                user_id: {
                    [Op.eq]: data.to_id
                }
            }
        })
        let hasHTML = false;
        if (data.record) {
            let ret = await ctx.wo_messages.create({
                from_id: ctx.userHashUserId[data.from_id],
                to_id: data.to_id,
                text: "",
                media: data.mediaFilename,
                mediaFileName: data.mediaName,
                seen: Math.floor(Date.now() / 1000),
                time: Math.floor(Date.now() / 1000)
            })
            data.mediaId = ret.id;
            await socket.emit('private_message_page', {
                html: await compiledTemplates.messageListOwnerTrueWithMedia(ctx, data, fromUser, nextId, data.color, data.isSticker),
                id: data.to_id,
                receiver: ctx.userHashUserId[data.from_id],
                sender: ctx.userHashUserId[data.from_id],
                status: 200,
                color: data.color,
                mediaLink: funcs.Wo_GetLink(ctx, data.mediaId),
                time: '<div class="messages-last-sent pull-right time ajax-time" title="' + moment().toISOString() + '">..</div>'
            });
        }
        let msg;
        ({ msg, hasHTML } = funcs.Wo_Emo(data.msg))
        data.msg = msg

        if (!data.mediaId) {
            let link_regex = new RegExp('(http\:\/\/|https\:\/\/|www\.)([^\ ]+)', 'gi');
            let mention_regex = new RegExp('@([A-Za-z0-9_]+)', 'gi');
            // let hashtag_regex = new RegExp('#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)', 'gi');

            let linkSearch = msg.match(link_regex)
            if (linkSearch && linkSearch.length > 0) {
                hasHTML = true;
                for (let linkSearchOne of linkSearch) {
                    let matchUrl = striptags(linkSearchOne)
                    let syntax = '[a]' + escape(matchUrl) + '[/a]'
                    data.msg = data.msg.replace(link_regex, syntax)
                }
            }
            let mentionSearch = msg.match(mention_regex)
            if (mentionSearch && mentionSearch.length > 0) {
                hasHTML = true;
                for (let mentionSearchOne of mentionSearch) {
                    let mention = await ctx.wo_users.findOne({
                        where: {
                            username: mentionSearchOne.substr(1, mentionSearchOne.length)
                        }
                    })
                    if (mention) {
                        let match_replace = '@[' + mention['user_id'] + ']';
                        data.msg = data.msg.replace(mention_regex, match_replace)
                    }
                }
            }
            let hashTagSearch = msg.match(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi)
            if (hashTagSearch && hashTagSearch.length > 0) {
                hasHTML = true
                for (let hashTagSearchOne of hashTagSearch) {
                    let hashdata = await funcs.Wo_GetHashtag(ctx, hashTagSearchOne.substr(1))
                    let replaceString = '#[' + hashdata['id'] + ']';
                    data.msg = data.msg.replace(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi, replaceString)
                    await ctx.wo_hashtags.update({
                        last_trend_time: Math.floor(Date.now() / 1000),
                        trend_use_num: hashdata["trend_use_num"] + 1
                    },
                        {
                            where: {
                                id: hashdata['id']
                            }
                        })
                }
            }
            let sendable_message = await funcs.Wo_Markup(ctx, data.msg);
            let temp = await compiledTemplates.messageListOwnerTrue(ctx, data, fromUser, nextId, hasHTML, sendable_message, data.color)

            callback({
                status: 200,
                html: temp,
                receiver: data.to_id,
                sender: ctx.userHashUserId[data.from_id]
            })

            // send same message to all tabs
            for (userSocket of remainingSameUserSockets) {
                await userSocket.emit('private_message', {
                    messages_html: await compiledTemplates.chatListOwnerTrue(ctx, data, fromUser, nextId, hasHTML, sendable_message, data.color),
                    id: data.to_id,
                    receiver: ctx.userHashUserId[data.from_id],
                    sender: ctx.userHashUserId[data.from_id],
                    status: 200,
                    color: data.color,
                    message: data.msg,
                    message_html: sendable_message,
                    time: '<div class="messages-last-sent pull-right time ajax-time" title="' + moment().toISOString() + '">..</div>'
                });
                await userSocket.emit('private_message_page', {
                    html: await compiledTemplates.messageListOwnerTrue(ctx, data, fromUser, nextId, hasHTML, sendable_message, data.color),
                    id: data.to_id,
                    receiver: ctx.userHashUserId[data.from_id],
                    sender: ctx.userHashUserId[data.from_id],
                    status: 200,
                    color: data.color,
                    message: data.msg,
                    message_html: sendable_message,
                    time: '<div class="messages-last-sent pull-right time ajax-time" title="' + moment().toISOString() + '">..</div>'
                });
            }

            await socketEvents.privateMessageToPersonOwnerFalse(ctx, io, data, fromUser, nextId, hasHTML, sendable_message, data.color)
            await socketEvents.privateMessagePageToPersonOwnerFalse(ctx, io, data, fromUser, nextId, hasHTML, sendable_message, data.color)

            // if recepient has chat open then send last seen 
            if (ctx.userIdChatOpen[data.to_id] && ctx.userIdChatOpen[data.to_id].filter(d => d == ctx.userHashUserId[data.from_id]).length ||
                ctx.userIdExtra[data.to_id] && ctx.userIdExtra[data.to_id].active_message_user_id && +ctx.userIdExtra[data.to_id].active_message_user_id === +ctx.userHashUserId[data.from_id]) {
                await ctx.wo_messages.create({
                    from_id: ctx.userHashUserId[data.from_id],
                    to_id: data.to_id,
                    text: data.msg,
                    seen: Math.floor(Date.now() / 1000),
                    time: Math.floor(Date.now() / 1000)
                })
                await socketEvents.lastseen(ctx, socket, { seen: Math.floor(Date.now() / 1000) })
            }
            else {
                await ctx.wo_messages.create({
                    from_id: ctx.userHashUserId[data.from_id],
                    to_id: data.to_id,
                    text: data.msg,
                    seen: 0,
                    time: Math.floor(Date.now() / 1000)
                })
            }
            await funcs.updateOrCreate(ctx.wo_userschat, {
                user_id: ctx.userHashUserId[data.from_id],
                conversation_user_id: data.to_id,
            }, {
                time: Math.floor(Date.now() / 1000),
                user_id: ctx.userHashUserId[data.from_id],
                conversation_user_id: data.to_id,
            })
            await funcs.updateOrCreate(ctx.wo_userschat, {
                conversation_user_id: ctx.userHashUserId[data.from_id],
                user_id: data.to_id,
            }, {
                time: Math.floor(Date.now() / 1000),
                conversation_user_id: ctx.userHashUserId[data.from_id],
                user_id: data.to_id,
            })
        }
        else {
            for (userSocket of remainingSameUserSockets) {
                await userSocket.emit('private_message', {
                    messages_html: await compiledTemplates.chatListOwnerTrueWithMedia(ctx, data, fromUser, nextId, data.color),
                    id: data.to_id,
                    receiver: ctx.userHashUserId[data.from_id],
                    sender: ctx.userHashUserId[data.from_id],
                    status: 200,
                    color: data.color,
                    mediaLink: funcs.Wo_GetLink(ctx, data.mediaId),
                    time: '<div class="messages-last-sent pull-right time ajax-time" title="' + moment().toISOString() + '">..</div>'
                });
                await userSocket.emit('private_message_page', {
                    html: await compiledTemplates.messageListOwnerTrueWithMedia(ctx, data, fromUser, nextId, data.color),
                    id: data.to_id,
                    receiver: ctx.userHashUserId[data.from_id],
                    sender: ctx.userHashUserId[data.from_id],
                    status: 200,
                    color: data.color,
                    mediaLink: funcs.Wo_GetLink(ctx, data.mediaId),
                    time: '<div class="messages-last-sent pull-right time ajax-time" title="' + moment().toISOString() + '">..</div>'
                });
            }
            await socketEvents.privateMessagePageToPersonOwnerFalseWithMedia(ctx, io, data, fromUser, data.isSticker)
            await socketEvents.privateMessageToPersonOwnerFalseWithMedia(ctx, io, data, fromUser, data.isSticker)
            await ctx.wo_messages.update({
                seen: Math.floor(Date.now() / 1000)
            },
                {
                    where: {
                        from_id: ctx.userHashUserId[data.from_id],
                        to_id: data.to_id,
                    }
                })
        }
        //await socketEvents.emitUserStatus(ctx, io, ctx.userHashUserId[data.from_id])
       // await socketEvents.emitUserStatus(ctx, io, data.to_id)
        // await socketEvents.updateMessageUsersList(ctx, io, ctx.userHashUserId[data.from_id], data.to_id)
       // await socketEvents.updateMessageUsersList(ctx, io, data.to_id, data.to_id)


        // if (ctx.userHashUserId[data.user_id]) {
        //     await funcs.Wo_LastSeen(ctx, ctx.userHashUserId[data.user_id])
        // }
    })
    socket.on("active-message-user-change", async (data) => {
        if (data.group) {
            if (ctx.userIdExtra[ctx.userHashUserId[data.from_id]]) {
                ctx.userIdExtra[ctx.userHashUserId[data.from_id]].active_message_group_id = data.group_id;
                // await socketEvents.emitUserStatus(ctx, io, ctx.userHashUserId[data.from_id])
                // await socketEvents.updateMessageUsersList(ctx, io, ctx.userHashUserId[data.from_id])
                await socketEvents.updateMessageGroupsList(ctx, io, ctx.userHashUserId[data.from_id])
                return
            }
            ctx.userIdExtra[ctx.userHashUserId[data.from_id]] = { active_message_group_id: data.group_id };
        }
        else {
            if (ctx.userIdExtra[ctx.userHashUserId[data.from_id]]) {
                ctx.userIdExtra[ctx.userHashUserId[data.from_id]].active_message_user_id = data.user_id;
                // await socketEvents.emitUserStatus(ctx, io, ctx.userHashUserId[data.from_id])
                // await socketEvents.updateMessageUsersList(ctx, io, ctx.userHashUserId[data.from_id])
                await socketEvents.updateMessageGroupsList(ctx, io, ctx.userHashUserId[data.from_id])
                return
            }
            ctx.userIdExtra[ctx.userHashUserId[data.from_id]] = { active_message_user_id: data.user_id };
        }
        // await socketEvents.emitUserStatus(ctx, io, ctx.userHashUserId[data.from_id])
        // await socket.emitUserStatus(ctx, io, data.user_id)
        // await socketEvents.updateMessageUsersList(ctx, io, ctx.userHashUserId[data.from_id])
        await socketEvents.updateMessageGroupsList(ctx, io, ctx.userHashUserId[data.from_id])
    })
    socket.on('typing', async (data) => {
        let fromUser = await ctx.wo_users.findOne({
            where: {
                user_id: {
                    [Op.eq]: ctx.userHashUserId[data.user_id]
                }
            }
        })
        if (!fromUser) {
            console.log("Skipping no from_user")
            return
        }
        if (ctx.userIdExtra[ctx.userHashUserId[data.user_id]]) {
            if (ctx.userIdExtra[ctx.userHashUserId[data.user_id]].typingTimeout) {
                clearTimeout(ctx.userIdExtra[ctx.userHashUserId[data.user_id]].typingTimeout)
            }
            ctx.userIdExtra[ctx.userHashUserId[data.user_id]].typingTimeout = setTimeout(async () => {
                await socketEvents.typingDone(ctx, io, data, ctx.userHashUserId[data.user_id])
            }, 2000)
        }
        else {
            ctx.userIdExtra[ctx.userHashUserId[data.user_id]] = {
                typingTimeout: setTimeout(async () => {
                    await socketEvents.typingDone(ctx, io, data, ctx.userHashUserId[data.user_id])
                }, 2000)
            }
        }
        // await funcs.Wo_RegisterTyping(data.user_id, data.recipient_id, 1)
        await socketEvents.typing(ctx, io, fromUser.avatar, data.recipient_id, ctx.userHashUserId[data.user_id])
    })

    socket.on('typing_done', async (data) => {
        // await funcs.Wo_RegisterTyping(data.user_id, data.recipient_id, 0)
        await socketEvents.typingDone(ctx, io, data, ctx.userHashUserId[data.user_id])
    })

    socket.on("color-change", async (data) => {
        let remainingSameUserSockets = []
        if (ctx.userIdSocket[ctx.userHashUserId[data.from_id]]) {
            remainingSameUserSockets = ctx.userIdSocket[ctx.userHashUserId[data.from_id]].filter(d => d.id != socket.id)
        }
        io.to(data.id).emit('color-change', { color: data.color, sender: data.id, id: ctx.userHashUserId[data.from_id] })
        for (let userSocket of remainingSameUserSockets) {
            userSocket.emit("color-change", { color: data.color, sender: ctx.userHashUserId[data.from_id], id: data.id })
        }
    })

    socket.on("sync_groups", async (data) => {
        await socketEvents.updateMessageGroupsList(ctx, io, ctx.userHashUserId[data.from_id])
    })

    // Private message chat side
    socket.on("private_message", async (data, callback) => {
        console.log(data)
        if ((!data.msg || data.msg.trim() === "") && !data.mediaId && !data.record) {
            console.log("Message has no text, neither media, skipping")
            return
        }

        let remainingSameUserSockets = []
        if (ctx.userIdSocket[ctx.userHashUserId[data.from_id]]) {
            remainingSameUserSockets = ctx.userIdSocket[ctx.userHashUserId[data.from_id]].filter(d => d.id != socket.id)
        }

        let lastId = await ctx.wo_messages.findOne({
            limit: 1,
            attributes: ["id"],
            where: {
                [Op.or]: [
                    {
                        from_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        },
                        to_id: {
                            [Op.eq]: data.to_id
                        }
                    },
                    {
                        from_id: {
                            [Op.eq]: data.to_id
                        },
                        to_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        }
                    }
                ]
            },
            order: [['id', 'DESC']]
        })
        let nextId = (lastId && lastId.id) ? (+lastId.id + 1) : 1
        let fromUser = await ctx.wo_users.findOne({
            where: {
                user_id: {
                    [Op.eq]: ctx.userHashUserId[data.from_id]
                }
            }
        })
        let toUser = await ctx.wo_users.findOne({
            where: {
                user_id: {
                    [Op.eq]: data.to_id
                }
            }
        })
        let hasHTML = false;
        let msg;
        if (data.record) {
            hasHTML = true
            let ret = await ctx.wo_messages.create({
                from_id: ctx.userHashUserId[data.from_id],
                to_id: data.to_id,
                text: "",
                media: data.mediaFilename,
                mediaFileName: data.mediaName,
                seen: Math.floor(Date.now() / 1000),
                time: Math.floor(Date.now() / 1000),
            })
            data.mediaId = ret.id;
            await socket.emit('private_message', {
                messages_html: await compiledTemplates.chatListOwnerTrueWithMedia(ctx, data, fromUser, nextId, data.color, data.isSticker),
                id: data.to_id,
                receiver: ctx.userHashUserId[data.from_id],
                sender: ctx.userHashUserId[data.from_id],
                status: 200,
                color: data.color,
                isMedia: true,
                isRecord: true,
                mediaLink: funcs.Wo_GetLink(ctx, data.mediaId),
                time: '<div class="messages-last-sent pull-right time ajax-time" title="' + moment().toISOString() + '">..</div>',
            });
        }
        ({ msg, hasHTML } = funcs.Wo_Emo(data.msg))
        data.msg = msg
        if (!data.mediaId) {
            let link_regex = new RegExp('(http\:\/\/|https\:\/\/|www\.)([^\ ]+)', 'gi');
            let mention_regex = new RegExp('@([A-Za-z0-9_]+)', 'gi');
            // let hashtag_regex = new RegExp('#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)', 'gi');

            let linkSearch = msg.match(link_regex)
            if (linkSearch && linkSearch.length > 0) {
                hasHTML = true;
                for (let linkSearchOne of linkSearch) {
                    let matchUrl = striptags(linkSearchOne)
                    let syntax = '[a]' + escape(matchUrl) + '[/a]'
                    data.msg = data.msg.replace(link_regex, syntax)
                }
            }
            let mentionSearch = msg.match(mention_regex)
            if (mentionSearch && mentionSearch.length > 0) {
                hasHTML = true;
                for (let mentionSearchOne of mentionSearch) {
                    let mention = await ctx.wo_users.findOne({
                        where: {
                            username: mentionSearchOne.substr(1, mentionSearchOne.length)
                        }
                    })
                    if (mention) {
                        let match_replace = '@[' + mention['user_id'] + ']';
                        data.msg = data.msg.replace(mention_regex, match_replace)
                    }
                }
            }
            let hashTagSearch = msg.match(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi)
            if (hashTagSearch && hashTagSearch.length > 0) {
                hasHTML = true
                for (let hashTagSearchOne of hashTagSearch) {
                    let hashdata = await funcs.Wo_GetHashtag(ctx, hashTagSearchOne.substr(1))
                    let replaceString = '#[' + hashdata['id'] + ']';
                    data.msg = data.msg.replace(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi, replaceString)
                    await ctx.wo_hashtags.update({
                        last_trend_time: Math.floor(Date.now() / 1000),
                        trend_use_num: hashdata["trend_use_num"] + 1
                    },
                        {
                            where: {
                                id: hashdata['id']
                            }
                        })
                }
            }

            let sendable_message = await funcs.Wo_Markup(ctx, data.msg);

            callback({
                status: 200,
                html: await compiledTemplates.chatListOwnerTrue(ctx, data, fromUser, nextId, hasHTML, sendable_message, data.color),
                receiver: data.to_id,
                sender: ctx.userHashUserId[data.from_id],
                message: data.msg,
                message_html: sendable_message,
                time: '<div class="messages-last-sent pull-right time ajax-time" title="' + moment().toISOString() + '">..</div>',
                isMedia: false,
                isRecord: false,
            })
            // send same message to all tabs
            for (userSocket of remainingSameUserSockets) {
                await userSocket.emit('private_message', {
                    messages_html: await compiledTemplates.chatListOwnerTrue(ctx, data, fromUser, nextId, hasHTML, sendable_message, data.color),
                    id: data.to_id,
                    status: 200,
                    receiver: ctx.userHashUserId[data.from_id],
                    sender: ctx.userHashUserId[data.from_id],
                    color: data.color,
                    self: true,
                    message: data.msg,
                    message_html: sendable_message,
                    time: '<div class="messages-last-sent pull-right time ajax-time" title="' + moment().toISOString() + '">..</div>',
                    isMedia: false,
                    isRecord: false,
                });
                await userSocket.emit('private_message_page', {
                    html: await compiledTemplates.messageListOwnerTrue(ctx, data, fromUser, nextId, hasHTML, sendable_message, data.color),
                    id: data.to_id,
                    status: 200,
                    receiver: ctx.userHashUserId[data.from_id],
                    sender: ctx.userHashUserId[data.from_id],
                    color: data.color,
                    self: true,
                    isMedia: false,
                    isRecord: false,
                    message: data.msg,
                    message_html: sendable_message,
                    time: '<div class="messages-last-sent pull-right time ajax-time" title="' + moment().toISOString() + '">..</div>'
                });
            }
            await socketEvents.privateMessageToPersonOwnerFalse(ctx, io, data, fromUser, nextId, hasHTML, sendable_message, data.color);
            await socketEvents.privateMessagePageToPersonOwnerFalse(ctx, io, data, fromUser, nextId, hasHTML, sendable_message, data.color)
            // if recepient has chat open then send last seen 
            if ((ctx.userIdChatOpen[data.to_id] && ctx.userIdChatOpen[data.to_id].filter(d => d == ctx.userHashUserId[data.from_id]).length) ||
                ctx.userIdExtra[data.to_id] && ctx.userIdExtra[data.to_id].active_message_user_id && +ctx.userIdExtra[data.to_id].active_message_user_id === +ctx.userHashUserId[data.from_id]) {
                await ctx.wo_messages.create({
                    from_id: ctx.userHashUserId[data.from_id],
                    to_id: data.to_id,
                    text: data.msg,
                    seen: Math.floor(Date.now() / 1000),
                    time: Math.floor(Date.now() / 1000)
                })
                await socketEvents.lastseen(ctx, socket, { seen: Math.floor(Date.now() / 1000) })

            } else {
                await ctx.wo_messages.create({
                    from_id: ctx.userHashUserId[data.from_id],
                    to_id: data.to_id,
                    text: data.msg,
                    seen: 0,
                    time: Math.floor(Date.now() / 1000)
                })
            }
            await funcs.updateOrCreate(ctx.wo_userschat, {
                user_id: ctx.userHashUserId[data.from_id],
                conversation_user_id: data.to_id,
            }, {
                time: Math.floor(Date.now() / 1000),
                user_id: ctx.userHashUserId[data.from_id],
                conversation_user_id: data.to_id,
                color: data.color
            })
            await funcs.updateOrCreate(ctx.wo_userschat, {
                conversation_user_id: ctx.userHashUserId[data.from_id],
                user_id: data.to_id,
            }, {
                time: Math.floor(Date.now() / 1000),
                conversation_user_id: ctx.userHashUserId[data.from_id],
                user_id: data.to_id,
                color: data.color
            })
        }
        else {
            for (userSocket of remainingSameUserSockets) {
                await userSocket.emit('private_message', {
                    messages_html: await compiledTemplates.chatListOwnerTrueWithMedia(ctx, data, fromUser, nextId, hasHTML, data.color, data.isSticker),
                    id: data.to_id,
                    receiver: ctx.userHashUserId[data.from_id],
                    sender: ctx.userHashUserId[data.from_id],
                    status: 200,
                    color: data.color,
                    message: data.msg,
                    time: '<div class="messages-last-sent pull-right time ajax-time" title="' + moment().toISOString() + '">..</div>',
                    mediaLink: funcs.Wo_GetLink(ctx, data.mediaId),
                    isMedia: true,
                    isRecord: true,
                });
                await userSocket.emit('private_message_page', {
                    html: await compiledTemplates.messageListOwnerTrueWithMedia(ctx, data, fromUser, nextId, hasHTML, data.color, data.isSticker),
                    id: data.to_id,
                    receiver: ctx.userHashUserId[data.from_id],
                    sender: ctx.userHashUserId[data.from_id],
                    status: 200,
                    color: data.color,
                    message: data.msg,
                    time: '<div class="messages-last-sent pull-right time ajax-time" title="' + moment().toISOString() + '">..</div>',
                    mediaLink: funcs.Wo_GetLink(ctx, data.mediaId),
                    isMedia: true,
                    isRecord: true,
                });
            }
            await socketEvents.privateMessagePageToPersonOwnerFalseWithMedia(ctx, io, data, fromUser, nextId, hasHTML, data.isSticker)
            await socketEvents.privateMessageToPersonOwnerFalseWithMedia(ctx, io, data, fromUser, nextId, hasHTML, data.isSticker)
            await ctx.wo_messages.update({
                seen: Math.floor(Date.now() / 1000)
            },
                {
                    where: {
                        from_id: ctx.userHashUserId[data.from_id],
                        to_id: data.to_id,
                    }
                })
        }
        //await socketEvents.emitUserStatus(ctx, io, ctx.userHashUserId[data.from_id])
        //await socketEvents.emitUserStatus(ctx, io, data.to_id)
        // await socketEvents.updateMessageUsersList(ctx, io, ctx.userHashUserId[data.from_id], data.to_id)
        //await socketEvents.updateMessageUsersList(ctx, io, data.to_id, data.to_id)

        // if (ctx.userHashUserId[data.user_id]) {
        //     await funcs.Wo_LastSeen(ctx, ctx.userHashUserId[data.user_id])
        // }
    })
    socket.on("loadmore", async (data, callback) => {
        let fromUser = await ctx.wo_users.findOne({
            where: {
                user_id: {
                    [Op.eq]: ctx.userHashUserId[data.from_id]
                }
            }
        })
        let after_message_id = await ctx.wo_messages.findOne({
            where: {
                [Op.or]: [
                    {
                        from_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        },
                        to_id: {
                            [Op.eq]: data.to_id
                        }
                    },
                    {
                        from_id: {
                            [Op.eq]: data.to_id
                        },
                        to_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        }
                    }
                ]
            }
        })
        let messages = await ctx.wo_messages.findAll({
            limit: 15,
            where: {
                id: {
                    [Op.gte]: after_message_id.id,
                    [Op.lt]: data.before_message_id
                },
                [Op.or]: [
                    {
                        from_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        },
                        to_id: {
                            [Op.eq]: data.to_id
                        }
                    },
                    {
                        from_id: {
                            [Op.eq]: data.to_id
                        },
                        to_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        }
                    }
                ]
            },
            order: [['id', 'DESC']]
        })
        let html = ""
        for (let message_index = messages.length - 1; message_index >= 0; message_index--) {
            let message = messages[message_index]
            if (message.media && message.media != "") {
                let d = { ...data }
                d.mediaId = message.id;
                if (message.from_id === ctx.userHashUserId[data.from_id]) {
                    html += await compiledTemplates.chatListOwnerTrueWithMedia(ctx, d, fromUser, message.id, data.color, data.isSticker)
                }
                else {
                    html += await compiledTemplates.chatListOwnerFalseWithMedia(ctx, d, fromUser, message.id, true, data.isSticker)
                }
            } else {
                let msg = message.text || "";
                if (!message.text) {
                    message.text = ""
                }
                let hasHTML = message.text.split(" ").includes("<i")
                // ({ msg, hasHTML } = funcs.Wo_Emo(message.text))
                // message.text = msg
                let link_regex = new RegExp('(http\:\/\/|https\:\/\/|www\.)([^\ ]+)', 'gi');
                let mention_regex = new RegExp('@([A-Za-z0-9_]+)', 'gi');
                // let hashtag_regex = new RegExp('#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)', 'gi');

                let linkSearch = msg.match(link_regex)
                if (linkSearch && linkSearch.length > 0) {
                    hasHTML = true;
                    for (let linkSearchOne of linkSearch) {
                        let matchUrl = striptags(linkSearchOne)
                        let syntax = '[a]' + escape(matchUrl) + '[/a]'
                        message.text = message.text.replace(link_regex, syntax)
                    }
                }
                let mentionSearch = msg.match(mention_regex)
                if (mentionSearch && mentionSearch.length > 0) {
                    hasHTML = true;
                    for (let mentionSearchOne of mentionSearch) {
                        let mention = await ctx.wo_users.findOne({
                            where: {
                                username: mentionSearchOne.substr(1, mentionSearchOne.length)
                            }
                        })
                        if (mention) {
                            let match_replace = '@[' + mention['user_id'] + ']';
                            message.text = message.text.replace(mention_regex, match_replace)
                        }
                    }
                }
                let hashTagSearch = msg.match(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi)
                if (hashTagSearch && hashTagSearch.length > 0) {
                    hasHTML = true
                    for (let hashTagSearchOne of hashTagSearch) {
                        let hashdata = await funcs.Wo_GetHashtag(ctx, hashTagSearchOne.substr(1))
                        let replaceString = '#[' + hashdata['id'] + ']';
                        message.text = message.text.replace(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi, replaceString)
                        await ctx.wo_hashtags.update({
                            last_trend_time: Math.floor(Date.now() / 1000),
                            trend_use_num: hashdata["trend_use_num"] + 1
                        },
                            {
                                where: {
                                    id: hashdata['id']
                                }
                            })
                    }
                }
                let sendable_message = await funcs.Wo_Markup(ctx, message.text);
                if (message.from_id === ctx.userHashUserId[data.from_id]) {
                    html += await compiledTemplates.chatListOwnerTrue(ctx, data, fromUser, message.id, true, sendable_message, data.color)
                } else {
                    html += await compiledTemplates.chatListOwnerFalse(ctx, data, fromUser, message.id, true, sendable_message)
                }
            }
        }
        callback({
            status: 200,
            html: html
        })
    })

    socket.on("loadmore_page", async (data, callback) => {
        let fromUser = await ctx.wo_users.findOne({
            where: {
                user_id: {
                    [Op.eq]: ctx.userHashUserId[data.from_id]
                }
            }
        })
        let after_message_id = await ctx.wo_messages.findOne({
            where: {
                [Op.or]: [
                    {
                        from_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        },
                        to_id: {
                            [Op.eq]: data.to_id
                        }
                    },
                    {
                        from_id: {
                            [Op.eq]: data.to_id
                        },
                        to_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        }
                    }
                ]
            }
        })
        let messages = await ctx.wo_messages.findAll({
            limit: 15,
            where: {
                id: {
                    [Op.gte]: after_message_id.id,
                    [Op.lt]: data.before_message_id
                },
                [Op.or]: [
                    {
                        from_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        },
                        to_id: {
                            [Op.eq]: data.to_id
                        }
                    },
                    {
                        from_id: {
                            [Op.eq]: data.to_id
                        },
                        to_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        }
                    }
                ]
            },
            order: [['id', 'DESC']]
        })
        let html = ""
        for (let message_index = messages.length - 1; message_index >= 0; message_index--) {
            let message = messages[message_index]
            if (message.media && message.media != "") {
                let d = { ...data }
                d.mediaId = message.id;
                if (message.from_id === ctx.userHashUserId[data.from_id]) {
                    html += await compiledTemplates.messageListOwnerTrueWithMedia(ctx, d, fromUser, message, true, data.color, data.isSticker)
                }
                else {
                    html += await compiledTemplates.messageListOwnerFalseWithMedia(ctx, d, message, fromUser, data.isSticker)
                }
            } else {
                let msg = message.text || "";
                if (!message.text) {
                    message.text = ""
                }
                let hasHTML = msg.split(" ").includes("<i")
                // ({ msg, hasHTML } = funcs.Wo_Emo(message.text))
                // message.text = msg
                let link_regex = new RegExp('(http\:\/\/|https\:\/\/|www\.)([^\ ]+)', 'gi');
                let mention_regex = new RegExp('@([A-Za-z0-9_]+)', 'gi');
                // let hashtag_regex = new RegExp('#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)', 'gi');

                let linkSearch = msg.match(link_regex)
                if (linkSearch && linkSearch.length > 0) {
                    hasHTML = true;
                    for (let linkSearchOne of linkSearch) {
                        let matchUrl = striptags(linkSearchOne)
                        let syntax = '[a]' + escape(matchUrl) + '[/a]'
                        message.text = message.text.replace(link_regex, syntax)
                    }
                }
                let mentionSearch = msg.match(mention_regex)
                if (mentionSearch && mentionSearch.length > 0) {
                    hasHTML = true;
                    for (let mentionSearchOne of mentionSearch) {
                        let mention = await ctx.wo_users.findOne({
                            where: {
                                username: mentionSearchOne.substr(1, mentionSearchOne.length)
                            }
                        })
                        if (mention) {
                            let match_replace = '@[' + mention['user_id'] + ']';
                            message.text = message.text.replace(mention_regex, match_replace)
                        }
                    }
                }
                let hashTagSearch = msg.match(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi)
                if (hashTagSearch && hashTagSearch.length > 0) {
                    hasHTML = true
                    for (let hashTagSearchOne of hashTagSearch) {
                        let hashdata = await funcs.Wo_GetHashtag(ctx, hashTagSearchOne.substr(1))
                        let replaceString = '#[' + hashdata['id'] + ']';
                        message.text = message.text.replace(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi, replaceString)
                        await ctx.wo_hashtags.update({
                            last_trend_time: Math.floor(Date.now() / 1000),
                            trend_use_num: hashdata["trend_use_num"] + 1
                        },
                            {
                                where: {
                                    id: hashdata['id']
                                }
                            })
                    }
                }
                let sendable_message = await funcs.Wo_Markup(ctx, message.text);
                if (message.from_id === ctx.userHashUserId[data.from_id]) {
                    html += await compiledTemplates.messageListOwnerTrue(ctx, data, fromUser, message, true, sendable_message, data.color)
                }
                else {
                    html += await compiledTemplates.messageListOwnerFalse(ctx, data, message, fromUser, true, sendable_message)
                }
            }
        }
        callback({
            status: 200,
            html: html
        })
    })


    socket.on("loadmore_group", async (data, callback) => {
        let fromUser = await ctx.wo_users.findOne({
            where: {
                user_id: {
                    [Op.eq]: ctx.userHashUserId[data.from_id]
                }
            }
        })
        let messages = await ctx.wo_messages.findAll({
            limit: 15,
            where: {
                id: {
                    [Op.lt]: data.before_message_id
                },
                [Op.or]: [
                    {
                        from_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        },
                        group_id: {
                            [Op.eq]: data.group_id
                        }
                    },
                    {
                        group_id: {
                            [Op.eq]: data.group_id
                        },
                        to_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        }
                    }
                ]
            },
            order: [['id', 'DESC']]
        })
        let html = ""
        for (let message of messages) {
            if (message.media && message.media != "") {
                let d = { ...data }
                d.mediaId = message.id;
                if (message.from_id === ctx.userHashUserId[data.from_id]) {
                    html += await compiledTemplates.groupListOwnerTrueWithMedia(ctx, fromUser, message.id, d, data.isSticker)
                }
                else {
                    html += await compiledTemplates.groupListOwnerFalseWithMedia(ctx, fromUser, message.id, d, data.isSticker)
                }
            } else {
                let hasHTML = message.text.split(" ").includes("<i")
                let msg = message.text;
                // ({ msg, hasHTML } = funcs.Wo_Emo(message.text))
                // message.text = msg
                let link_regex = new RegExp('(http\:\/\/|https\:\/\/|www\.)([^\ ]+)', 'gi');
                let mention_regex = new RegExp('@([A-Za-z0-9_]+)', 'gi');
                // let hashtag_regex = new RegExp('#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)', 'gi');

                let linkSearch = msg.match(link_regex)
                if (linkSearch && linkSearch.length > 0) {
                    hasHTML = true;
                    for (let linkSearchOne of linkSearch) {
                        let matchUrl = striptags(linkSearchOne)
                        let syntax = '[a]' + escape(matchUrl) + '[/a]'
                        message.text = message.text.replace(link_regex, syntax)
                    }
                }
                let mentionSearch = msg.match(mention_regex)
                if (mentionSearch && mentionSearch.length > 0) {
                    hasHTML = true;
                    for (let mentionSearchOne of mentionSearch) {
                        let mention = await ctx.wo_users.findOne({
                            where: {
                                username: mentionSearchOne.substr(1, mentionSearchOne.length)
                            }
                        })
                        if (mention) {
                            let match_replace = '@[' + mention['user_id'] + ']';
                            message.text = message.text.replace(mention_regex, match_replace)
                        }
                    }
                }
                let hashTagSearch = msg.match(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi)
                if (hashTagSearch && hashTagSearch.length > 0) {
                    hasHTML = true
                    for (let hashTagSearchOne of hashTagSearch) {
                        let hashdata = await funcs.Wo_GetHashtag(ctx, hashTagSearchOne.substr(1))
                        let replaceString = '#[' + hashdata['id'] + ']';
                        message.text = message.text.replace(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi, replaceString)
                        await ctx.wo_hashtags.update({
                            last_trend_time: Math.floor(Date.now() / 1000),
                            trend_use_num: hashdata["trend_use_num"] + 1
                        },
                            {
                                where: {
                                    id: hashdata['id']
                                }
                            })
                    }
                }
                let sendable_message = await funcs.Wo_Markup(ctx, message.text);
                if (message.from_id === ctx.userHashUserId[data.from_id]) {
                    html += await compiledTemplates.groupListOwnerTrue(ctx, fromUser, message.id, data, true, sendable_message)
                } else {
                    html += await compiledTemplates.groupListOwnerFalse(ctx, fromUser, message.id, data, true, sendable_message)
                }
            }
        }
        callback({
            status: 200,
            html: html
        })
    })

    socket.on("loadmore_group_page", async (data, callback) => {
        let fromUser = await ctx.wo_users.findOne({
            where: {
                user_id: {
                    [Op.eq]: ctx.userHashUserId[data.from_id]
                }
            }
        })
        let messages = await ctx.wo_messages.findAll({
            limit: 15,
            where: {
                id: {
                    [Op.lt]: data.before_message_id
                },
                [Op.or]: [
                    {
                        from_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        },
                        group_id: {
                            [Op.eq]: data.group_id
                        }
                    },
                    {
                        group_id: {
                            [Op.eq]: data.group_id
                        },
                        to_id: {
                            [Op.eq]: ctx.userHashUserId[data.from_id]
                        }
                    }
                ]
            },
            order: [['id', 'DESC']]
        })
        let html = ""
        for (let message of messages) {
            if (message.media && message.media != "") {
                let d = { ...data }
                d.mediaId = message.id;
                if (message.from_id === ctx.userHashUserId[data.from_id]) {
                    html += await compiledTemplates.messageListOwnerTrueWithMedia(ctx, d, fromUser, message, true, data.color, data.isSticker)
                }
                else {
                    html += await compiledTemplates.messageListOwnerFalseWithMedia(ctx, d, message, fromUser, data.isSticker)
                }
            } else {
                let hasHTML = message.text.split(" ").includes("<i")
                let msg = message.text;
                // ({ msg, hasHTML } = funcs.Wo_Emo(message.text))
                // message.text = msg
                let link_regex = new RegExp('(http\:\/\/|https\:\/\/|www\.)([^\ ]+)', 'gi');
                let mention_regex = new RegExp('@([A-Za-z0-9_]+)', 'gi');
                // let hashtag_regex = new RegExp('#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)', 'gi');

                let linkSearch = msg.match(link_regex)
                if (linkSearch && linkSearch.length > 0) {
                    hasHTML = true;
                    for (let linkSearchOne of linkSearch) {
                        let matchUrl = striptags(linkSearchOne)
                        let syntax = '[a]' + escape(matchUrl) + '[/a]'
                        message.text = message.text.replace(link_regex, syntax)
                    }
                }
                let mentionSearch = msg.match(mention_regex)
                if (mentionSearch && mentionSearch.length > 0) {
                    hasHTML = true;
                    for (let mentionSearchOne of mentionSearch) {
                        let mention = await ctx.wo_users.findOne({
                            where: {
                                username: mentionSearchOne.substr(1, mentionSearchOne.length)
                            }
                        })
                        if (mention) {
                            let match_replace = '@[' + mention['user_id'] + ']';
                            message.text = message.text.replace(mention_regex, match_replace)
                        }
                    }
                }
                let hashTagSearch = msg.match(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi)
                if (hashTagSearch && hashTagSearch.length > 0) {
                    hasHTML = true
                    for (let hashTagSearchOne of hashTagSearch) {
                        let hashdata = await funcs.Wo_GetHashtag(ctx, hashTagSearchOne.substr(1))
                        let replaceString = '#[' + hashdata['id'] + ']';
                        message.text = message.text.replace(/#([^`~!@$%^&*\#()\-+=\\|\/\.,<>?\'\":;{}\[\]* ]+)/gi, replaceString)
                        await ctx.wo_hashtags.update({
                            last_trend_time: Math.floor(Date.now() / 1000),
                            trend_use_num: hashdata["trend_use_num"] + 1
                        },
                            {
                                where: {
                                    id: hashdata['id']
                                }
                            })
                    }
                }
                let sendable_message = await funcs.Wo_Markup(ctx, message.text);
                if (message.from_id === ctx.userHashUserId[data.from_id]) {
                    html += await compiledTemplates.messageListOwnerTrue(ctx, data, fromUser, message, true, sendable_message, data.color)
                }
                else {
                    html += await compiledTemplates.messageListOwnerFalse(ctx, data, message, fromUser, true, sendable_message)
                }
            }
        }
        callback({
            status: 200,
            html: html
        })
    })


    socket.on("on_name_changed", async (data) => {
        let user_id = ctx.userHashUserId[data.from_id]
        let followers = await ctx.wo_followers.findAll({
            attributes: ["following_id"],
            where: {
                follower_id: user_id,
                following_id: {
                    [Op.not]: user_id
                }
            },
            raw: true
        })
        for (let follow of followers) {
            await io.to(follow.following_id).emit("on_name_changed", {
                user_id: user_id,
                name: data.name
            })
        }
    })


    socket.on("on_avatar_changed", async (data) => {
        let user_id = ctx.userHashUserId[data.from_id]
        let followers = await ctx.wo_followers.findAll({
            attributes: ["following_id"],
            where: {
                follower_id: user_id,
                following_id: {
                    [Op.not]: user_id
                }
            },
            raw: true
        })
        for (let follow of followers) {
            await io.to(follow.following_id).emit("on_avatar_changed", {
                user_id: user_id,
                name: data.name
            })
        }
    })

    socket.on("on_user_loggedin", async (data) => {
        let user_id = ctx.userHashUserId[data.from_id]
        let followers = await ctx.wo_followers.findAll({
            attributes: ["following_id"],
            where: {
                follower_id: user_id,
                following_id: {
                    [Op.not]: user_id
                }
            },
            raw: true
        })
        for (let follow of followers) {
            await io.to(follow.following_id).emit("on_user_loggedin", { user_id: user_id })
        }
    })

    socket.on("event_notification", async (data) => {
        let user_id = ctx.userHashUserId[data.user_id]
        if (!data.to_id) {
            return;
        }
        let to_id = data.to_id;
        let eventData = await ctx.wo_events.findOne({
            attributes: ["poster_id"],
            where: {
                id: to_id
            },
            raw: true
        });
        if (eventData.poster_id > 0) {
            let notification_type = "new_notification";
            if (data.type == 'removed') {
                notification_type = "new_notification_removed";
            }
            if (eventData.poster_id !== user_id) {
                await io.to(eventData.poster_id).emit(notification_type, { user_id: user_id });
            }
        }
    })

    socket.on("group_notification", async (data) => {
        let user_id = ctx.userHashUserId[data.user_id]
        if (!data.to_id) {
            return;
        }
        let to_id = data.to_id;
        let groupData = await ctx.wo_groups.findOne({
            attributes: ["user_id"],
            where: {
                id: to_id
            },
            raw: true
        });
        if (groupData.user_id > 0) {
            let notification_type = "new_notification";
            if (data.type == 'removed') {
                notification_type = "new_notification_removed";
            }
            if (groupData.user_id !== user_id) {
                await io.to(groupData.user_id).emit(notification_type, { user_id: user_id });
            }
        }
    })

    socket.on("page_notification", async (data) => {
        let user_id = ctx.userHashUserId[data.user_id]
        if (!data.to_id) {
            return;
        }
        let to_id = data.to_id;
        let pageData = await ctx.wo_pages.findOne({
            attributes: ["user_id"],
            where: {
                page_id: to_id
            },
            raw: true
        });
        if (pageData.user_id > 0) {
            let notification_type = "new_notification";
            if (data.type == 'removed') {
                notification_type = "new_notification_removed";
            }
            if (pageData.user_id !== user_id) {
                await io.to(pageData.user_id).emit(notification_type, { user_id: user_id });
            }
        }
    })

    socket.on("user_followers_notification", async (data) => {
        let user_id = ctx.userHashUserId[data.user_id]
        let followers = await ctx.wo_followers.findAll({
            attributes: ["following_id"],
            where: {
                follower_id: user_id,
                following_id: {
                    [Op.not]: user_id
                }
            },
            raw: true
        })
        for (let follow of followers) {
            await io.to(follow.following_id).emit("new_notification", { user_id: user_id })
        }
    })

    socket.on("comment_typing", async (data) => {
        
    })


    socket.on("user_notification", async (data) => {
        let user_id = ctx.userHashUserId[data.user_id]
        if (!data.to_id) {
            return;
        }
        let to_id = data.to_id;
        let userData = await ctx.wo_users.findOne({
            attributes: ["user_id"],
            where: {
                user_id: to_id
            },
            raw: true
        });
        if (userData.user_id > 0) {
            let notification_type = "new_notification";
            if (data.type == 'removed') {
                notification_type = "new_notification_removed";
            } else if (data.type == 'request') {
                 notification_type = "new_request";
            } else if (data.type == 'request_removed') {
                notification_type = "new_request_removed";
            } else if (data.type == 'create_video') {
                notification_type = "new_video_call";
            }
            if (userData.user_id !== user_id) {
                await io.to(userData.user_id).emit(notification_type, { notification_data: data });
            }
        }
    })

    socket.on("post_notification", async (data) => {
        let user_id = ctx.userHashUserId[data.user_id]
        if (!data.post_id) {
            return;
        }
        let post_id = data.post_id;
        let postData = await ctx.wo_posts.findOne({
            attributes: ["user_id"],
            where: {
                id: post_id
            },
            raw: true
        });
        let notification_type = "new_notification";
        if (data.type == 'removed') {
            notification_type = "new_notification_removed";
        }
        if (postData.user_id !== user_id) {
            await io.to(postData.user_id).emit(notification_type, { post_id: post_id });
        }
    })

    socket.on("comment_notification", async (data) => {
        let user_id = ctx.userHashUserId[data.user_id]
        if (!data.comment_id) {
            return;
        }
        let comment_id = data.comment_id;
        let commentData = await ctx.wo_comments.findOne({
            attributes: ["user_id"],
            where: {
                id: comment_id
            },
            raw: true
        });
        let notification_type = "new_notification";

        if (data.type == 'removed') {
            notification_type = "new_notification_removed";
        }
        if (typeof data.for !== 'undefined') {
            let replyData = await ctx.wo_comment_replies.findAll({
                attributes: ["user_id"],
                where: {
                    comment_id: comment_id,
                },
                raw: true
            })
            let sentUsers = [];
            if (replyData.length > 0) {
                for (let userReply of replyData) {
                    if (userReply.user_id > 0) {
                        if (userReply.user_id !== user_id && !sentUsers.includes(userReply.user_id)) {
                            await io.to(userReply.user_id).emit("new_notification", { comment_id: comment_id });
                            await io.to(userReply.user_id).emit("load_comment_replies", { comment_id: comment_id });
                            sentUsers.push(userReply.user_id);
                        }
                    }
                }
            } 
            if (commentData.user_id !== user_id && !sentUsers.includes(commentData.user_id)) {
                await io.to(commentData.user_id).emit(notification_type, { comment_id: comment_id });
            }
        } else {
            if (commentData.user_id !== user_id) {
                await io.to(commentData.user_id).emit(notification_type, { comment_id: comment_id });
            }
        }
    })

    socket.on("reply_notification", async (data) => {
        let user_id = ctx.userHashUserId[data.user_id]
        if (!data.reply_id) {
            return;
        }
        let reply_id = data.reply_id;
        let replyData = await ctx.wo_comment_replies.findOne({
            attributes: ["user_id"],
            where: {
                id: reply_id
            },
            raw: true
        });
        let notification_type = "new_notification";
        if (data.type == 'removed') {
            notification_type = "new_notification_removed";
        }
        if (replyData.user_id !== user_id) {
            await io.to(replyData.user_id).emit(notification_type, { reply_id: reply_id });
        }
    })

    socket.on("on_user_loggedoff", async (data) => {
        let user_id = ctx.userHashUserId[data.from_id]
        let followers = await ctx.wo_followers.findAll({
            attributes: ["following_id"],
            where: {
                follower_id: user_id,
                following_id: {
                    [Op.not]: user_id
                }
            },
            raw: true
        })
        for (let follow of followers) {
            await io.to(follow.following_id).emit("on_user_loggedoff", { user_id: user_id })
        }
    })

    

    socket.on('disconnect', async (reason) => {
        console.log('a user disconnected ' + socket.id + " " + reason);
        let hash = ctx.socketIdUserHash[socket.id]
        let user_id = ctx.userHashUserId[hash]
        ctx.userIdCount[user_id] > 0 ? ctx.userIdCount[user_id] = ctx.userIdCount[user_id] - 1 : delete ctx.userIdCount[user_id]
        if (ctx.userIdCount[user_id] === 0) {
            delete ctx.userIdCount[user_id]
            delete ctx.userHashUserId[hash]

            // emit user logged off
            let followers = await ctx.wo_followers.findAll({
                attributes: ["following_id"],
                where: {
                    follower_id: user_id,
                    following_id: {
                        [Op.not]: user_id
                    }
                },
                raw: true
            })

            for (let follow of followers) {
                await io.to(follow.following_id).emit("on_user_loggedoff", { user_id: user_id })
            }
        }
        if (ctx.userIdSocket[user_id]) {
            ctx.userIdSocket[user_id] = ctx.userIdSocket[user_id].filter(d => d.id != socket.id)
        }
        ctx.userIdExtra = {}
        delete ctx.socketIdUserHash[socket.id]
    });
}  