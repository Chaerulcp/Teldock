function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            return res.status(422).json({
                success: false,
                error: 'Invalid request data',
            });
        }

        req.body = result.data;
        next();
    };
}

module.exports = { validateBody };
