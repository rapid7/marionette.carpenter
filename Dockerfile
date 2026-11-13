FROM python:2.7.14

RUN echo "deb http://archive.debian.org/debian/ jessie-backports main" > /etc/apt/sources.list
RUN echo "deb-src http://archive.debian.org/debian/ jessie-backports main" /etc/apt/sources.list
RUN echo "deb http://archive.debian.org/debian/ jessie main contrib non-free" >> /etc/apt/sources.list
RUN echo "deb-src http://archive.debian.org/debian/ jessie main contrib non-free" >> /etc/apt/sources.list

RUN apt-get update && apt-get install --force-yes -yqq apt-transport-https gawk bison sqlite3 libgmp-dev

# Ruby
RUN (\curl -o mpapis.asc -sSL https://rvm.io/mpapis.asc && echo "08f64631c598cbe4398c5850725c8e6ab60dc5d86b6214e069d7ced1d546043b  mpapis.asc" | sha256sum -c && gpg --import ./mpapis.asc) && rm mpapis.asc
RUN (\curl -o pkuczynski.asc -sSL https://rvm.io/pkuczynski.asc && echo "d33ce5907fe28e6938feab7f63a9ef8a26a565878b1ad5bce063a86019aeaf77  pkuczynski.asc" | sha256sum -c && gpg --import ./pkuczynski.asc) && rm pkuczynski.asc
RUN \curl -L https://get.rvm.io | bash -s stable
RUN /bin/bash -l -c "rvm install 2.7"
RUN /bin/bash -l -c "gem install compass -v 0.12.7"

# Node
RUN curl https://mise.run | sh
RUN ~/.local/bin/mise use node@4
RUN echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc
