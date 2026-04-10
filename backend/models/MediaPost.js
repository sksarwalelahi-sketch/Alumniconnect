const mongoose = require('mongoose');

const mediaPostSchema = new mongoose.Schema({
    alumni: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    alumniProfile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AlumniProfile',
        required: true,
        index: true
    },
    mediaUrl: {
        type: String,
        required: true
    },
    mediaType: {
        type: String,
        enum: ['image', 'video', 'file'],
        default: 'file'
    },
    mimeType: {
        type: String
    },
    originalName: {
        type: String
    },
    caption: {
        type: String,
        maxlength: [500, 'Caption cannot exceed 500 characters']
    }
}, {
    timestamps: true
});

mediaPostSchema.index({ alumniProfile: 1, createdAt: -1 });

module.exports = mongoose.model('MediaPost', mediaPostSchema);
