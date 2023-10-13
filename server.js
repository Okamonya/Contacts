const express = require('express');
const crypto = require('crypto');
const Contact = require('./models');

const app = express();
app.use(express.json());

// Function to encrypt data
function encrypt(text) {
  const cipher = crypto.createCipher('aes-256-cbc', 'your-secret-key');
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Function to decrypt data
function decrypt(text) {
  const decipher = crypto.createDecipher('aes-256-cbc', 'your-secret-key');
  let decrypted = decipher.update(text, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Create a new contact
app.post('/contacts', async (req, res) => {
  try {
    const { firstName, secondName, thirdName, phoneNumber } = req.body;
    const encryptedPhoneNumber = encrypt(phoneNumber);

    const newContact = await Contact.create({
      firstName,
      secondName,
      thirdName,
      phoneNumber: encryptedPhoneNumber,
    });

    res.json({ message: 'Contact added', id: newContact.contact_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all contacts
app.get('/contacts', async (req, res) => {
  try {
    const contacts = await Contact.findAll();
    const decryptedContacts = contacts.map(contact => ({
      id: contact.contact_id,
      firstName: contact.firstName,
      secondName: contact.secondName,
      thirdName: contact.thirdName,
      phoneNumber: decrypt(contact.phoneNumber),
    }));
    res.json(decryptedContacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a contact
app.put('/contacts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { firstName, secondName, thirdName, phoneNumber } = req.body;
    const encryptedPhoneNumber = encrypt(phoneNumber);

    const [count] = await Contact.update(
      {
        firstName,
        secondName,
        thirdName,
        phoneNumber: encryptedPhoneNumber,
      },
      {
        where: { contact_id: id },
      }
    );

    if (count === 0) {
      res.status(404).json({ message: 'Contact not found' });
    } else {
      res.json({ message: 'Contact updated', changes: count });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a contact
app.delete('/contacts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const count = await Contact.destroy({
      where: { contact_id: id },
    });

    if (count === 0) {
      res.status(404).json({ message: 'Contact not found' });
    } else {
      res.json({ message: 'Contact deleted', changes: count });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
