import Message from "../models/message.model.js";
import User from "../models/user.model.js";

export const getUserForSidebar = async(req,res) => {

    try {
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({_id: { $ne: loggedInUserId}}).select("-password");

        res.status(200).json(filteredUsers)
    } catch (error) {
        console.log("error in getUsersForSidebar", error.message);
        res.status(500).json({ error: "Internal Server Error"});

    }

};

export const getMessage = async(req,res) => {
    try {
        const { id:userToChatId } = req.params
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                {senderId:myId, receiverId:userToChatId},
                {senderId:userToChatId, receiverId:myId}
            ]
        })

        res.status(200).json(messages);
    } catch (error) {
        console.log("error in getMessage controller", error.message);
        res.status(500).json({ error: "Internal Server Error"});
    }
}

export const sendMessage = async(req,res)=> {
try {
    const {text, image}= req.body;
    const { id: receiverId} = req.params;
    const senderId = req.user._id;

    let imageUrl;

    if(imageUrl){ 
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
        senderId,
        receiverId,
        text,
        image: imageUrl
    });

    await newMessage.save();

    res.status(201).json(newMessage)

} catch (error) {
    console.log("error in sendMessage controller", error.message);
        res.status(500).json({ error: "Internal Server Error"});
}
};